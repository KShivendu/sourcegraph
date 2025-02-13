package main

import (
	"context"
	"fmt"
	"time"

	"github.com/buildkite/go-buildkite/v3/buildkite"

	"github.com/sourcegraph/sourcegraph/dev/internal/team"
)

type CheckOptions struct {
	FailuresThreshold int
	BuildTimeout      time.Duration
}

type CommitInfo struct {
	Commit string
	Author string

	AuthorSlackID string

	Build *buildkite.Build
}

type CheckResults struct {
	// LockBranch indicates whether or not the Action will lock the branch.
	LockBranch bool
	// Action is a callback to actually execute changes.
	Action func() (err error)
	// FailedCommits lists the commits with failed builds that were detected.
	FailedCommits []CommitInfo
}

// CheckBuilds is the main buildchecker program. It checks the given builds for relevant
// failures and runs lock/unlock operations on the given branch.
func CheckBuilds(ctx context.Context, branch BranchLocker, teammates team.TeammateResolver, builds []buildkite.Build, opts CheckOptions) (results *CheckResults, err error) {
	results = &CheckResults{}

	// Scan for first build with a meaningful state
	var firstFailedBuildIndex int
	for i, b := range builds {
		if isBuildPassed(b) {
			fmt.Printf("most recent finished build %d passed\n", *b.Number)
			results.Action, err = branch.Unlock(ctx)
			if err != nil {
				return nil, fmt.Errorf("unlockBranch: %w", err)
			}
			return
		}
		if isBuildFailed(b, opts.BuildTimeout) {
			fmt.Printf("most recent finished build %d failed\n", *b.Number)
			firstFailedBuildIndex = i
			break
		}

		// Otherwise, keep looking for a completed (failed or passed) build
	}

	// if failed, check if failures are consecutive
	var exceeded bool
	results.FailedCommits, exceeded, _ = checkConsecutiveFailures(
		builds[max(firstFailedBuildIndex-1, 0):], // Check builds starting with the one we found
		opts.FailuresThreshold,
		opts.BuildTimeout,
		false,
		false)
	if !exceeded {
		fmt.Println("threshold not exceeded")
		results.Action, err = branch.Unlock(ctx)
		if err != nil {
			return nil, fmt.Errorf("unlockBranch: %w", err)
		}
		return
	}

	fmt.Println("threshold exceeded, this is a big deal!")

	// annotate the failures with their author (Github handle), so we can reach them
	// over Slack.
	for i, info := range results.FailedCommits {
		teammate, err := teammates.ResolveByCommitAuthor(ctx, "sourcegraph", "sourcegraph", info.Commit)
		if err != nil {
			// If we can't resolve the user, do not interrupt the process.
			fmt.Println("teammates.ResolveByCommitAuthor: ", err)
			continue
		}
		results.FailedCommits[i].AuthorSlackID = teammate.SlackID
	}

	results.LockBranch = true
	results.Action, err = branch.Lock(ctx, results.FailedCommits, "dev-experience")
	if err != nil {
		return nil, fmt.Errorf("lockBranch: %w", err)
	}
	return
}

func isBuildPassed(build buildkite.Build) bool {
	return build.State != nil && *build.State == "passed"
}

func isBuildFailed(build buildkite.Build, timeout time.Duration) bool {
	// Has state and is failed
	if build.State != nil && (*build.State == "failed" || *build.State == "cancelled") {
		return true
	}
	// Created, but not done
	if timeout > 0 && build.CreatedAt != nil && build.FinishedAt == nil {
		// Failed if exceeded timeout
		return time.Now().After(build.CreatedAt.Add(timeout))
	}
	return false
}

func checkConsecutiveFailures(
	builds []buildkite.Build,
	threshold int,
	timeout time.Duration,
	returnAll bool,
	includeBuild bool,
) (failedCommits []CommitInfo, thresholdExceeded bool, buildsScanned int) {
	failedCommits = []CommitInfo{}

	var consecutiveFailures int
	var build buildkite.Build
	for buildsScanned, build = range builds {
		if isBuildPassed(build) {
			// If we find a passed build we are done
			return
		} else if !isBuildFailed(build, timeout) {
			// we're only safe if non-failures are actually passed, otherwise
			// keep looking
			continue
		}

		var author string
		if build.Author != nil {
			author = fmt.Sprintf("%s (%s)", build.Author.Name, build.Author.Email)
		}

		// Process this build as a failure
		consecutiveFailures += 1
		commit := CommitInfo{
			Author: author,
		}
		if build.Commit != nil {
			commit.Commit = *build.Commit
		}
		if includeBuild {
			b := build // copy
			commit.Build = &b
		}
		failedCommits = append(failedCommits, commit)
		if consecutiveFailures >= threshold {
			thresholdExceeded = true
			if !returnAll {
				return
			}
		}
	}

	return
}

func max(x, y int) int {
	if x < y {
		return y
	}
	return x
}
