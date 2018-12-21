<!DOCTYPE html>
<html>
  <head>
    <title>Add Document</title>
    <link rel="stylesheet" href="{{{base}}}/css/style.css">
  </head>
  <body>
    <h1>Add Document</h1>
    <ul>
      {{#errors}}
        <li class="error">{{.}}</li>
      {{/errors}}
    </ul>
    <form method="POST" action="{{{base}}}/add" enctype="multipart/form-data">
	{{#fields}}
	    <label>
	    <span class="label">
	      Choose file:
	    </span>
	    <input id="{{id}}" name="{{name}}" {{#type}}type="{{type}}"{{/type}}
	           value="{{value}}">
	    <br/>
	    {{#errorMessage}}
	      <span class="error">{{errorMessage}}</span><br/>
	    {{/errorMessage}}
	{{/fields}}
      <input id="submit" name="submit" type="submit" value="add" class="control">
    </form> 
    {{>footer}}
  </body>
</html>
