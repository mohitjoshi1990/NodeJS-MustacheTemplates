'use strict';

const axios = require('axios');


function DocsWs(baseUrl) {
  this.docsUrl = `${baseUrl}/docs`;
}

module.exports = DocsWs;



DocsWs.prototype.doc = async function(id) {
  try {
    const response = await axios.get(`${this.docsUrl}/${id}`);
    return response.data.content;
  }
  catch (err) {
    console.error(err);
    throw (err.response && err.response.data) ? err.response.data : err;
  }  
};

DocsWs.prototype.list = async function(q) {
  try {
    const url = this.docsUrl + ((q === undefined) ? '' : `?${q}`);
    const response = await axios.get(url);
    return response.data;
  }
  catch (err) {
    console.error(err);
    throw (err.response && err.response.data) ? err.response.data : err;
  }
};

DocsWs.prototype.create = async function(req) {
  try {
    const response = await axios.post(`${this.docsUrl}`, req.body);
    return response.data;
  }
  catch (err) {
    console.error(err);
    throw (err.response && err.response.data) ? err.response.data : err;
  }
};
