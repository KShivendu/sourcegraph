# How to address common monorepo performance problems

This document is intended as an explanation of common issues faced by Sourcegraph instances syncing monorepos. Sourcegraph search relies on the retrieval and indexing of git repos. For very large repos, more computational resources are required to perform the necessary operations. As such tuning Sourcegraph's services is often the resolution to bugs and performance issues covered in this how-to.

_This document is targeted at docker-compose and kubernetes deployments, where services can be isolated for individual tuning_

The following bullets provide a general guidline to which service may require more resources:

* `sourcegraph-frontend` CPU/memory resource allocations
* `searcher` CPU/memory resource allocations (allocate enough memory to hold all non-binary files in your repositories)
* `indexedSearch` CPU/memory resource allocations (for the `zoekt-indexserver` pod, allocate enough memory to hold all non-binary files in your largest repository; for the `zoekt-webserver` pod, allocate enough memory to hold ~2.7x the size of all non-binary files in your repositories)
* `symbols` CPU/memory resource allocations
* `gitserver` CPU/memory resource allocations (allocate enough memory to hold your Git packed bare repositories)

## Symbols sidebar - Processing symbols

![Screen Shot 2021-11-15 at 12 35 07 AM](https://user-images.githubusercontent.com/13024338/141749036-95759cbe-abd5-4d78-91eb-618423d2f66c.png)

If you are regularly seeing the `Processing symbols is taking longer than expected. Try again in a while` warning in your sidebar, its likely that your symbols and/or gitserver services are underprovisioned and need more CPU/mem resources.

The [symbols sidebar](https://sourcegraph.com/github.com/sourcegraph/sourcegraph/-/blob/client/web/src/repo/RepoRevisionSidebarSymbols.tsx?L42) is dependent on the symbols and gitserver services. Upon opening the symbols sidebar, a search query is made to the GraphQL API to retrieve the symbols associated with the current git commit. There are a few different query paths:

- If indexed search is enabled and Zoekt has [an index for the commit](https://sourcegraph.com/search?q=context:global+repo:%5Egithub%5C.com/sourcegraph/sourcegraph%24+file:%5Einternal/search/symbol/symbol%5C.go+if+branch+:%3D+indexedSymbolsBranch%28&patternType=literal), then the query should be resolved quickly. The high commit frequency of monorepos reduces the likelihood that Zoekt will have an index for any given commit. Zoekt only has one index per branch, and usually only the default branch is indexed. Zoekt **eagerly** indexes the tip, whereas the symbols service **lazily** indexes whichever commit you're on.
- If the symbols service has already indexed this commit (i.e. someone has visited the commit before) and it is [cached](https://sourcegraph.com/search?q=context:global+repo:%5Egithub%5C.com/sourcegraph/sourcegraph%24%406f4d327+file:symbols+cache.Open&patternType=literal), then the query should be resolved quickly.
- If the symbols service has already indexed a **different** commit in the same repository, then it will copy a previous index on disk, run [`git diff --name-status`](https://sourcegraph.com/search?q=context:global+repo:%5Egithub%5C.com/sourcegraph/sourcegraph%24+f:symbols+--name-status&patternType=regexp) to get the list of files that changed, run [`git archive files...`](https://sourcegraph.com/search?q=context:global+repo:%5Egithub%5C.com/sourcegraph/sourcegraph%24+file:%5Einternal/gitserver/client%5C.go+func+%28c+*Client%29+Archive%28&patternType=literal) to fetch the file contents, run [ctags](https://github.com/universal-ctags/ctags#readme) on those files, and update the symbols index. The query should be resolved in a few seconds (e.g. 300ms on the Kubernetes repo with 4M LOC and 15K files).
- If the symbols service has never seen this repository before, then it needs to process all symbols before being able to respond to the query. The query will likely time out and trigger the error in the screenshot. Processing all symbols can take minutes (e.g. 1m8s on the Kubernetes repo with 4M LOC and 15K files).

To address this concern, allocate more resources to the symbols service (to provide more processing power for indexing operations) and allocate more resources to the gitserver (to provide for the extra load associated with responding to fetch requests from symbols, and speed up sending the large repo).

Here's an example of a diff to improve symbols performance in a k8s deployment:

```diff
          name: debug
        resources:
          limits:
-           cpu: "3"
-           memory: 6G
          requests:
-           cpu: 500m
-           memory: 5G

          name: debug
        resources:
          limits:
+           cpu: "4"
+           memory: 16G
          requests:
+           cpu: "1"
+           memory: 8G
```

_Learn more about managing resources in [docker-compose](https://docs.sourcegraph.com/admin/install/docker-compose/operations) and [kubernetes](https://docs.sourcegraph.com/admin/install/kubernetes/operations)_

## Slow hover tooltip results

Hovering over a symbol results in a query for the definition. If the symbol is defined in a repo that has been indexed via LSIF, then Sourcegraph should respond with results quickly. However, if no LSIF index exists, the definition query will have the same performance characteristics as above in [symbols sidebar](#symbols-sidebar---processing-symbols) because it uses a `type:symbol` search.

## Slow history tab and git blame results

![Screen Shot 2021-11-15 at 1 10 16 AM](https://user-images.githubusercontent.com/13024338/141754063-2080c7c6-b5be-43c1-b9db-386e916d2968.png)

Selecting the Show History button while viewing a file initiates a request to [fetch commits](https://sourcegraph.com/search?q=context:global+repo:%5Egithub%5C.com/sourcegraph/sourcegraph%24+file:%5Eclient/web/src/repo/RepoRevisionSidebarCommits%5C.tsx+function+fetchCommits%28&patternType=literal) for the file. This request is ultimately resolved by gitserver using functionality similar to git log. To improve performance allocate gitserver more CPU.

## Common alerts

The following alerts are common to instances underprovisioned in relation to their monorepos, [learn more about alerts](https://docs.sourcegraph.com/admin/observability/alert_solutions):

- frontend: 20s+ 99th percentile code-intel successful search request duration over 5m
- frontend: 15s+ 90th percentile code-intel successful search request duration over 5m
- zoekt-webserver: 5% Indexed search request errors every 5m by code for 5m0s
- symbols: 25+ current fetch queue size
