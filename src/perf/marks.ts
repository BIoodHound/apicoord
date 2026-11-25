// Perf mark names are a contract with QA's harness (architecture §6.3).
export const markKeystroke = (): PerformanceMark => performance.mark('apicoord:ks')
export const markCommit = (seq: number): PerformanceMark =>
  performance.mark('apicoord:commit', { detail: { seq } })
