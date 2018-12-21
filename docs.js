'use strict';

const express = require('express');
const upload = require('multer')();
const fs = require('fs');
const mustache = require('mustache');
const Path = require('path');
const { URL } = require('url');
const bodyParser = require('body-parser');



const STATIC_DIR = 'statics';
const TEMPLATES_DIR = 'templates';

function serve(port, base, model) {
  const app = express();
  app.locals.port = port;
  app.locals.base = base;
  app.locals.model = model;
  process.chdir(__dirname);
  app.use(base, express.static(STATIC_DIR));
  setupTemplates(app, TEMPLATES_DIR);
  setupRoutes(app);
  app.listen(port, function() {
    console.log(`listening on port ${port}`);
  });
}


module.exports = serve;

/******************************** Routes *******************************/

function setupRoutes(app) {
  //@TODO add appropriate routes
	const base = app.locals.base;
	//app.use(cors());            //for security workaround in future projects
	app.use(bodyParser.json()); //all incoming bodies are JSON

	app.get(`${base}/search.html`, searchSelectedContent(app));
	app.get(`${base}/add.html`, addDoc(app));
	app.post(`${base}/add`, upload.single('file'),
	   addContent(app));
	app.get(`${base}/:docName`, getDoc(app)); //must be last
	app.get(`/`, redirectHome(app));
}

const FIELDS_INFO = {
  q: {
    friendlyName: 'query',
    id:'query',
    type: 'text',
    error: '',
  }
};

const FIELDS =
  Object.keys(FIELDS_INFO).map((n) => Object.assign({name: n}, FIELDS_INFO[n]));

const ADD_DOC_FIELD_INFO = {
  file: {
    friendlyName: 'file',
    id:'file',
    isRequired: 'true',
    type: 'file',
    error: "",
  },
};

const ADD_DOC_FIELDS =
  Object.keys(ADD_DOC_FIELD_INFO).map((n) => Object.assign({name: n}, ADD_DOC_FIELD_INFO[n]));

function replacer(match){
	return '<span class="search-term">'+match+'</span>'
}

/*************************** Action Routines ***************************/

function searchSelectedContent(app){
  return async function(req, res) {
	let errors = {};
	let model = {};
	let searchParams = {};
	let receiveQuery = getNonEmptyValues(req.query);
	let start=0;
	if(receiveQuery.q === undefined && receiveQuery.submit === undefined){		
		model = { base: app.locals.base, fields: FIELDS };
		const html = doMustache(app, 'search', model);
		res.send(html);
	}
	else{
		if (receiveQuery.q === undefined) {
			errors["q"]="please specify one-or-more search terms";
			model = errorModel(app, receiveQuery, errors);
		}
		else{
			let errorMsgStr = "";
			receiveQuery.q=decodeURI(receiveQuery.q)
			let searchCritArr = receiveQuery.q.split(/[,]?\s+/);
			let queryStringArr = searchCritArr;
			queryStringArr = queryStringArr.map((elem,index)=>index>0? "%20"+elem: elem);
			let errorMsgStrArr = searchCritArr;
			errorMsgStrArr = errorMsgStrArr.map((elem,index)=>index>0? " "+elem: elem);
			searchParams.q=queryStringArr;
			errorMsgStr=errorMsgStrArr.reduce((acc,value)=>acc+value, "");
			errorMsgStr=errorMsgStr.replace(new RegExp(",%20","g")," ");
			let queryString = queryStringArr.reduce((acc,value)=>acc+value, "");
			queryString = "q="+queryString;

			if (receiveQuery.start === undefined) {
				queryString+="&submit=search";
				start=0;
			}else{
				queryString+="&start="+receiveQuery.start;
				start=Number(receiveQuery.start);
			}
			try {
				receiveQuery.q=errorMsgStr;
				model = errorModel(app, receiveQuery, errors);
				model.searchdocs = await app.locals.model.list(queryString);
				if(model.searchdocs.results.length !== 0){
					for(let doclink of model.searchdocs.results){
						doclink.href =doclink.href.substring(doclink.href.indexOf("docs/")+5,doclink.href.length);
						for(const word of searchCritArr){
							doclink.lines=doclink.lines.map((elem)=>elem.replace(new RegExp(`${word}\\W`,"ig"),replacer));
						}
					}
					let alteredLink = {};
					for(const link of model.searchdocs.links){
						if(link.rel === 'previous'){				
							alteredLink.prevrel = "Previous";	
							searchParams.start=start-5;				
							alteredLink.prevhref = relativeUrl(req, '',searchParams);
						}else if(link.rel === 'next'){	
							if(start>=5){				
								alteredLink.prevrel = "Previous";	
								searchParams.start=start-5;				
								alteredLink.prevhref = relativeUrl(req, '',searchParams);
							}		
							alteredLink.nextrel = "Next";	
							searchParams.start=start+5;			
							alteredLink.nexthref = relativeUrl(req, '',searchParams);
						}
					}
					model.searchdocs.links=alteredLink;
				}else{
					errors = {_: `no document containing "${errorMsgStr}" found; please retry`};
					model = errorModel(app, receiveQuery, errors);
				}
			}
			catch (err) {
				console.error(err);
				errors = wsErrors(err);
				model = errorModel(app, receiveQuery, errors);
			}
	    }
	    const html = doMustache(app, 'searchresults', model);
	    res.send(html);
	}
  };
};


function addDoc(app){
  return async function(req, res) {
    const model = { base: app.locals.base, fields: ADD_DOC_FIELDS };
    const html = doMustache(app, 'add', model);
    res.send(html);
  };
};


function redirectHome(app){
  return async function(req, res) {
    res.redirect('/docs');
  };
};



function addContent(app){
  return async function(req, res) {
	let errors={};
	let model={};

	if (req.file === undefined) {
		errors["file"]="please select a file containing a document to upload";
		model = addErrorModel(app, req, errors);
		const html = doMustache(app, 'add', model);
		res.send(html);
	}
	else {
		let data ={}
		if(req.file.originalname.indexOf(".txt") > -1){
			data["name"]=req.file.originalname.substring(0,req.file.originalname.indexOf(".txt"));
		}else{
			data["name"]=req.file.originalname;			
		}
		data["content"]=req.file.buffer.toString('utf8');
		req.body=data;
		try {
			let filepathObj = await app.locals.model.create(req);			
			filepathObj.href = filepathObj.href.substring(filepathObj.href.indexOf("docs/")+5,filepathObj.href.length);
			res.redirect(filepathObj.href);
		}
		catch (err) {
			console.error(err);
			errors = wsErrors(err);
			model = addErrorModel(app, req, errors);
			const html = doMustache(app, 'add', model);
			res.send(html);
		}
	}
  };
};


function getDoc(app){
  return async function(req, res) {
	const name = req.params.docName;
	//calling up the data service to find the document contents.
	let errors = {};
	let model = {};
	try{
		const results = await app.locals.model.doc(name);
		model["name"]=name;
		model["content"]=results;
	}
	catch (err) {
		console.error(err);
		errors = wsErrors(err);
		model = addErrorModel(app, {}, errors);
	}
	model["base"]=app.locals.base;
	const html = doMustache(app, 'show', model);
	res.send(html);
  };
};

/************************ General Utilities ****************************/



/** Given map of field values and requires containing list of required
 *  fields, validate values.  Return errors hash or falsy if no errors.
 */
function validate(values, requires=[]) {
  const errors = {};
  requires.forEach(function (name) {
    if (values[name] === undefined) {
      errors[name] =
	`A value for '${FIELDS_INFO[name].friendlyName}' must be provided`;
    }
  });
  for (const name of Object.keys(values)) {
    const fieldInfo = FIELDS_INFO[name];
    const value = values[name];
    if (fieldInfo.regex && !value.match(fieldInfo.regex)) {
      errors[name] = fieldInfo.error;
    }
  }
  return Object.keys(errors).length > 0 && errors;
}

/** return object containing all non-empty values from object values */
function getNonEmptyValues(values) {
  const out = {};
  Object.keys(values).forEach(function(k) {
    const v = values[k];
    if (v && v.trim().length > 0) out[k] = v.trim();
  });
  return out;
}


/** Return a model suitable for mixing into a template */
function errorModel(app, values={}, errors={}) {
  return {
    base: app.locals.base,
    errors: errors._,
    fields: fieldsWithValues(values, errors)
  };
}


/** Return a model suitable for mixing into a template */
function addErrorModel(app, values={}, errors={}) {
  return {
    base: app.locals.base,
    errors: errors._,
    fields: addFieldsWithValues(values, errors)
  };
}

/** Return a URL relative to req.originalUrl.  Returned URL path
 *  determined by path (which is absolute if starting with /). For
 *  example, specifying path as ../search.html will return a URL which
 *  is a sibling of the current document.  Object queryParams are
 *  encoded into the result's query-string and hash is set up as a
 *  fragment identifier for the result.
 */
function relativeUrl(req, path='', queryParams={}, hash='') {
  const url = new URL('http://dummy.com');
  url.protocol = req.protocol;
  url.hostname = req.hostname;
  url.port = req.socket.address().port;
  url.pathname = req.originalUrl.replace(/(\?.*)?$/, '');
  if (path.startsWith('/')) {
    url.pathname = path;
  }
  else if (path) {
    url.pathname += `/${path}`;
  }
  url.search = '';
  Object.entries(queryParams).forEach(([k, v]) => {
    url.searchParams.set(k, v);
  });
  url.hash = hash;
  return url.toString();
}

/************************** Template Utilities *************************/

/** Return copy of FIELDS with values and errors injected into it. */
function fieldsWithValues(values, errors={}) {
  return FIELDS.map(function (info) {
    const name = info.name;
    const extraInfo = { value: values[name] };
    if (errors[name]) extraInfo.errorMessage = errors[name];
    return Object.assign(extraInfo, info);
  });
}

function addFieldsWithValues(values, errors={}) {
  return ADD_DOC_FIELDS.map(function (info) {
    const name = info.name;
    const extraInfo = { value: values[name] };
    if (errors[name]) extraInfo.errorMessage = errors[name];
    return Object.assign(extraInfo, info);
  });
}


/** Decode an error thrown by web services into an errors hash
 *  with a _ key.
 */
function wsErrors(err) {
  const msg = (err.message) ? err.message : 'web service error';
  console.error(msg);
  return { _: [ msg ] };
}

/** Return result of mixing view-model view into template templateId
 *  in app templates.
 */
function doMustache(app, templateId, view) {
  const templates = { footer: app.templates.footer };
  return mustache.render(app.templates[templateId], view, templates);
}

/** Add contents all dir/*.ms files to app templates with each 
 *  template being keyed by the basename (sans extensions) of
 *  its file basename.
 */
function setupTemplates(app, dir) {
  app.templates = {};
  for (let fname of fs.readdirSync(dir)) {
    const m = fname.match(/^([\w\-]+)\.ms$/);
    if (!m) continue;
    try {
      app.templates[m[1]] =
	String(fs.readFileSync(`${TEMPLATES_DIR}/${fname}`));
    }
    catch (e) {
      console.error(`cannot read ${fname}: ${e}`);
      process.exit(1);
    }
  }
}

