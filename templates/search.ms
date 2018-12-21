<!DOCTYPE html>
<html>
  <head>
    <title>Documents Collection Search</title>
    <link rel="stylesheet" href="{{{base}}}/css/style.css">
  </head>
  <body>
    <h1>Documents Collections Search</h1>
    <ul>
      {{#errors}}
        <li class="error">{{.}}</li>
      {{/errors}}
    </ul>
    <form method="GET" action="{{{base}}}/search.html">
	    <p>Please fill in one or more search terms in the field below:</p>
		{{#fields}}
		    <label>
		    <span class="label">
		    Search Terms:
		    </span>
		    <input id="{{id}}" name="{{name}}" {{#type}}type="{{type}}"{{/type}}
			   value="{{value}}">
		    </label>
		    <br/>
		    {{#errorMessage}}
		      <span class="error">{{errorMessage}}</span><br/>
		    {{/errorMessage}}
		{{/fields}}
        <input id="submit" name="submit" type="submit" value="search" class="control">
    </form> 
    {{>footer}}
  </body>
</html>
