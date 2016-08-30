# switch-sql-query
Query SQL from Switch via an ODBC connection.

## Flow element properties

### Credentials
- **Data source name** - The ODBC data source name.
- **Data source username** - The data source username.
- **Data source password** - The data source password.

### SQL query
The well formed SQL query. If you choose single or multi value result types, the first field will be selected. You don't have to worry about this if your query only returns a single field.

### Query type

#### Direct
Simply sends the query directly to the database, relying on Switch's variable parser to insert variables.

##### Example
```sql
SELECT Description FROM OrderHeader WHERE JobNumber = '[Job.PrivateData:Key="JobNumber"]' 
-- Results in:
-- SELECT Description FROM OrderHeader WHERE JobNumber = '123456' 
```
- **Private data:** [Job.PrivateData:Key="JobNumber"] => 123456

#### Parameterized
An imitation of SQL prepared statements which replaces *:placeholders* with variables. An attempt is made to remove unsafe SQL characters which could be used for injection as well as enforcing types.

##### Example
**Query:**
```sql
SELECT Description FROM OrderHeader WHERE JobNumber = :jobNumber
-- Results in:
-- SELECT Description FROM OrderHeader WHERE JobNumber = '123456' 
```
- **Placeholder:** :jobNumber
- **Value:** [Job.PrivateData:Key="JobNumber"] => 123;456
- **Type:** string

## Result type
This script supports three methods of returning results, depending on whether or not you want your values saved to private data, a dataset, or how many results you want to return.

### Single result value
Writes one string value to a particular private data tag. If the query returns multiple fields, it always selects the first one.

##### Example
Query:
```sql
/* Returns one row/job */
SELECT Description FROM OrderHeader WHERE JobNumber = '123456' 
```
Private data tag: _JobDescription_

Returns the following private data key:
- JobDescription => My quarterly mailer

### Multiple result value
Writes one string value per row to an incrimenting set of private data tags. You'll be prompted to enter a "Private data prefix". For each row returned, the value will be written to [Your Prefix]1, [Your Prefix]2, etc...

##### Example
Query:
```sql
/* Returns two rows/components */
SELECT Description FROM OrderComponent WHERE JobNumber = '123456' 
```
Private data prefix: _ComponentDescription_

Returns the following private data keys:
- ComponentDescription1 => My brochure
- ComponentDescription2 => My envelope

### Dataset
Writes the entire result set to an XML dataset for a given dataset name. 

##### Example
Query:
```sql
/* Returns two rows/components */
SELECT Description,ComponentNumber FROM OrderComponent WHERE JobNumber = '123456' 
```
Dataset name: _SQLQuery_

Returns the following embedded dataset:
```xml
<SQLQuery>
  <rows>
    <row>
      <Description>My brochure</Description>
      <ComponentNumber>1</ComponentNumber>
    </row>
    <row>
      <Description>My envelope</Description>
      <ComponentNumber>2</ComponentNumber>
    </row>
  </rows>
</SQLQuery>
```

## Versions
- **Version 1** - Standard
- **Version 2** - Add support for parameterized queries
- **Version 3** - Use traffic-light style connections
