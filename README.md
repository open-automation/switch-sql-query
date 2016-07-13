# switch-sql-query
Query SQL from Switch.

## Flow element properties

### Credentials
#### Data source name
The ODBC data source name.
#### Data source username
The data source username.
#### Data source password
The data source password.

### SQL query
The well formed SQL query. If you choose single or multi value result types, the first field will be selected. You don't have to worry about this if your query only returns a single field.

### Result type
This script supports three methods of returning results.

#### Single result value
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

#### Multiple result value
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

