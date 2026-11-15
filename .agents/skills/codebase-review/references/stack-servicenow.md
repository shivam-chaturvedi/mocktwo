# Stack: ServiceNow

## ServiceNow-Specific Issues to Look For

### Update Set Hygiene
- Are update sets named consistently and descriptively?
- Are there any update sets with conflicts or collisions?
- Are update sets scoped to a single logical change?
- Are there orphaned or incomplete update sets?
- Is there a clear promotion path (dev → test → prod)?

### Script Include Best Practices
- Are Script Includes using `prototype` pattern correctly?
- Are they scoped appropriately (global vs application)?
- Is `current` used safely (not passed between scopes)?
- Are there Script Includes that are never called?

### GlideRecord Usage
- Are queries using `addQuery()` / `addEncodedQuery()` (not string building)?
- Is `setLimit()` used for queries that could return large result sets?
- Are `getValue()` and `setValue()` used (not dot-walking on GlideElement)?
- Is `GlideAggregate` used for count/sum instead of looping over records?
- Are queries inside loops? (N+1 pattern — use `addQuery('sys_id', 'IN', list)`)

### ACL (Access Control)
- Are ACLs defined for all custom tables?
- Are there any tables with no ACLs (open to all)?
- Are field-level ACLs applied for sensitive fields?
- Are ACLs tested (not just assumed to work)?

### Business Rules
- Are Business Rules using `current.update()` inside before/after rules? (infinite loop risk)
- Are async Business Rules used for heavy processing?
- Are conditions set to limit when rules fire?
- Are there conflicting rules on the same table/event?

### Performance
- Are there client scripts making synchronous GlideAjax calls?
- Are list views loading too many fields?
- Are there UI Policies or Client Scripts on every form load that could be consolidated?

### CMDB-Specific (if applicable)
- Is the CI lifecycle managed (install_status, operational_status)?
- Are relationship types used correctly?
- Is data completeness measured (IRE methodology — all-or-nothing)?
- Are discovery sources reconciled?
- Is there a stale CI cleanup process?
