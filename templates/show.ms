<!DOCTYPE html>
<html>
  <head>
    {{#name}}<title>{{name}}</title>{{/name}}
    <link rel="stylesheet" href="{{{base}}}/css/style.css">
  </head>
  <body>
    {{#name}}<h1 class="doc-name">{{name}}</h1>{{/name}}
    <ul>
      {{#errors}}
        <li class="error">{{.}}</li>
      {{/errors}}
    </ul>
	{{#content}}
	    <pre class="content">{{content}}</pre>
	{{/content}}
    {{>footer}}
  </body>
</html>
