/* Property validation */
function isPropertyValid( s : Switch, tag : String, value : String ){
	//s.log(2, tag, string, value);


	// Verify placeholders
	if(tag == "Placeholder1" || tag == "Placeholder2" || tag == "Placeholder3"){
		// Allow blanks
		if(value == '') return true;
		// Ensure starts with colon
		var first_character = value.charAt(0);
		if(first_character !== ":") return false;
		// Ensure is a word, no spaces
		var space = value.indexOf(' ');
		if(space !== -1) return false;
	}

	// Verify values
	/*
	if(tag == "Parameter1Value"){
		if(s.getPropertyValue('Placeholder1')) return false;
	}
	*/

	return true;
}


/*
   Foreach helper function
	  callback
		Function to execute for each element, taking three arguments:
		currentValue
			The current element being processed in the array.
		index
			The index of the current element being processed in the array.
		array
			The array that forEach() is being applied to.
*/
var forEach = function(array, callback){
	var currentValue, index;
	for (i = 0; i < array.length; i += 1) {
		if(typeof array[i] == "undefined"){
			currentValue = null;
		} else {
			currentValue = array[i];
		}
		index = i;
		callback(currentValue, i, array);
    }
}

/*
  ODBC connection function
  	Last property is a callback which is given the DataSource as its only parameter.
  */
var odbcConnect = function(s : Switch, job : Job, ds_name, username, password, callback){

	// Attempt connection
	var data_source = new DataSource();
	var data_source_connected = data_source.connect(
			ds_name, username, password
		);

	//	Check connection
	if(data_source_connected == true){
		s.log(-1, "Connected");

		// Callback
		callback(data_source);

		data_source.disconnect(); // Kill connection
		job.log(-1, "Disconnected");
		return true;
	} else {
		job.log(3, "Could not connect to data source. Please check ODBC connection or credentials.");
		//job.sendToData(3, job.getPath());
		return false;
	}
}

var getQueryResult = function(s : Switch, job : Job, data_source, query, result_type, callback){

	// Make statement
	var statement = new Statement(data_source);
	// Execute query
	var query_successful = statement.execute(query);
	// Check valid query
	if(query_successful == true){
		// Check has some results
		if(statement.isRowAvailable() == true){
			index = 0;
			job.log(-1, "Row is found and available");
			if(result_type == "Dataset"){
				// Get every value
				do {
					number_of_columns = statement.getNumColumns();
					s.log(-1, "Found "+number_of_columns+" columns");
					rowArray = new Array( number_of_columns );

					statement.fetchRow();

					forEach(rowArray, function(field, col_index, column_name){

						column_name = statement.getColumnName(col_index);
						result_value = statement.getString(col_index, "UTF-8");
						callback(result_value, index, column_name);

					});

					index++;

				} while ( statement.isRowAvailable());
			} else {
				// get preference single/multiple
				do {
						statement.fetchRow();
						column_name = statement.getColumnName(index);
						result_value = statement.getString(0, "UTF-8");
						index++;
						callback(result_value, index, column_name);
				} while ( statement.isRowAvailable() && result_type == "Multiple result value");
			}
		} else {
			job.log(-1, "No row found");
			callback("", 0, "");
		}
		return true;
	} else {
		job.log(3, "Query execution was not successful.");
		//job.sendToData(3, job.getPath());
		return false;
	}
}

// XML helper function
var createElement = function(parent, doc, key, value, attributeAsKey){

	if(typeof(attributeAsKey) == 'undefined'){
		attributeAsKey = false;
	}

	var parentLength, index, child;
	parentLength = parent.getChildNodes().length;
	index = 'Key'+parentLength;

	//s.log(2, "parentLength: "+parentLength);

	if(attributeAsKey == true){
		child = doc.createElement(index, null);
	} else {
		child = doc.createElement(key, null);
	}

	// Set (sometimes) redundant key
	child.addAttribute("key", null, key);

	parent.appendChild(child);

	if(value){
		text = doc.createText( value );
		child.appendChild(text);
	}

	return child;
}

var appendToDataset = function(s : Switch, parent, doc, column_name, value, row_index){

	//s.log(2, column_name+": "+value +", row_index: "+index);

	if(doc.isWellFormed() == false){
		s.log(3, "Doc is not well formed");
	}

	createElement(parent, doc, column_name, value, false);

}

var parameterizeQuery = function( s : Switch, query : String )
{
	var getParametersArray = function(){
		var placeholder_1 = s.getPropertyValue('Placeholder1');
		var placeholder_2 = s.getPropertyValue('Placeholder2');
		var placeholder_3 = s.getPropertyValue('Placeholder3');

		// Build an array for parameters
		var parameters = [];
		if(placeholder_1){
			parameters.push({
				placeholder: placeholder_1,
				value: s.getPropertyValue('Parameter1Value'),
				type: s.getPropertyValue('Parameter1Type')
				});
		}
		if(placeholder_2){
			parameters.push({
				placeholder: placeholder_2,
				value: s.getPropertyValue('Parameter2Value'),
				type: s.getPropertyValue('Parameter2Type')
				});
		}
		if(placeholder_3){
			parameters.push({
				placeholder: placeholder_3,
				value: s.getPropertyValue('Parameter3Value'),
				type: s.getPropertyValue('Parameter3Type')
				});
		}
		s.log(-1, "num_parameters: " + parameters.length);
		return parameters;
	}

	var sanitizeParameters = function(parameters){

		// Strip out any illegals
		var original_string, sanitized_string;

		// Build regex
		var sqlRegex = new RegExp('[\|&;\$%@"<>\(\)\+,]');
		sqlRegex.global = true;
		var quoteRegex = new RegExp("'");
		quoteRegex.global = true;

		forEach(parameters, function(p, i){

			// Sanitization
			original_string = p.value;
			sanitized_string = original_string.replace(quoteRegex, "").replace(sqlRegex, " ");
			p.value = sanitized_string;
			if(original_string != sanitized_string){
				s.log(-1, "String sanitation. " + original_string + " => " + sanitized_string);
			}

			// Type casting
			if(p.type == 'int'){
				p.value = parseInt(p.value);
			}
			if(p.type == 'string'){
				p.value = "'" + p.value + "'";
			}

		});

		return parameters;
	}

	var sanitizeQuery = function( query, parametersArray, s : Switch ){
		var sanitized_query = query;
		var stateful_query;
		var sanitization_failure = false;

		// Swap placeholders with sanitized values
		forEach(parametersArray, function(p, i){
			stateful_query = sanitized_query;
			var regex = new RegExp(p.placeholder);
			regex.global = true;

			sanitized_query = sanitized_query.replace(regex, p.value);

			// Ensure all placeholders were used
			if(sanitized_query === stateful_query){
				s.log(3, "Parameterizing failure: Parameter " + p.placeholder + " was not utilized.");
				sanitization_failure = true;
			}
		});

		// Ensure no more placeholders exist
		var placeholderRegex = new RegExp(":\\w+");
		placeholderRegex.global = true;

		var remaining_placeholder_position = sanitized_query.search(placeholderRegex);

		if(remaining_placeholder_position !== -1){
			s.log(3, "Parameterizing failure: Remaining placeholder found after swapping at position " + remaining_placeholder_position + ".");
			sanitization_failure = true;
		}

		// Handle failures
		if(sanitization_failure === true){
			return false;
		}

		return sanitized_query;
	}

	var parameters = getParametersArray();
	var sanitized_parameters = sanitizeParameters(parameters);
	var sanitized_query = sanitizeQuery(query, sanitized_parameters, s);

	return sanitized_query;
}

function jobArrived( s : Switch, job : Job )
{
	var data_source_name = s.getPropertyValue('DataSourceName');
	var data_source_username = s.getPropertyValue('DataSourceUsername');
	var data_source_password = s.getPropertyValue('DataSourcePassword');
	var query = s.getPropertyValue('Query');
	var result_type = s.getPropertyValue('ResultType');
	var private_data_tag = s.getPropertyValue('PrivateDataTag');
	var private_data_prefix = s.getPropertyValue('PrivateDataPrefix');
	var dataset_name = s.getPropertyValue('DatasetName');
	var query_type = s.getPropertyValue('QueryType');

	var odbc_connect_result, get_query_result, parameterize_result;

	// Parameterize query
	if(query_type == 'Parameterized'){
		query = parameterizeQuery(s, query);

		if(query === false){
			// Fail job
			job.log(3, "Query has failed to parameterize. See previous log message(s).");
			parameterize_result = false;
		} else {
			s.log(-1, query);
			parameterize_result = true;
		}
	} else {
		parameterize_result = true;
	}

	// Create dataset if needed
	var doc = new Document();
	var dataset = job.createDataset("XML");
	var dataset_backing = dataset.getPath();

	// Write XML dataset
	var root = doc.createElement("SQLQuery");
	doc.setDocumentElement(root);
	var rows_node = createElement(root, doc, "rows", "");
	var current_row = 0;


	// Fire connection
	odbc_connect_result = odbcConnect(s, job, data_source_name, data_source_username, data_source_password, function(data_source){

		get_query_result = getQueryResult(s, job, data_source, query, result_type, function(value, index, column_name){
			if( result_type == "Multiple result value" ){
				job.setPrivateData( private_data_prefix + index, value );
			} else if( result_type == "Single result value" ){
				job.setPrivateData( private_data_tag, value );
			} else if( result_type == "Dataset" ){

				// Make new row node if new row
				row_node = createElement(rows_node, doc, "row", "", false);

				if(current_row < index){
					s.log(3, "err");
					row_node = createElement(rows_node, doc, "row", current_row, false);
					current_row = index;
				}

				// Write to dataset
				appendToDataset(s, row_node, doc, column_name, value, index);
			}
		});

	});

	if( result_type == "Dataset" ){
		// Finish dataset
		job.setDataset(dataset_name, dataset);
		var dataset_path = s.createPathWithName("dataset.xml", false);
		doc.save(dataset_backing);
	}

	// Success out
	if(get_query_result === true && odbc_connect_result === true && parameterize_result === true){
		//s.log(-1, "success triggered");
		job.sendToData(1, job.getPath() );
	} else {
		// job error data out should have already been sent.
		//s.log(-1, "failure triggered");
		job.sendToData(3, job.getPath());
	}
	return;
}
