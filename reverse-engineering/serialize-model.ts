/*
The MIT License (MIT)

Copyright (c) 2015 Mendix

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

/// <reference path='typings/tsd.d.ts' />

import {ModelSdkClient, IModel, IModelUnit, domainmodels, utils, projects} from "mendixmodelsdk";
import {MendixSdkClient, Project, OnlineWorkingCopy, loadAsPromise} from "mendixplatformsdk";

import when = require("when");
/*
 * Custom code in here
 * Currently this code prints all Documents in all Modules + Domain model in JavaScript code
 */
function printAllDocuments(model: IModel): when.Promise<void> {
    console.log(`Project ${model.id} created successfully`);

    //The following code is an example on retrieving all modules, entities, and associations
    return when.all<void>(model.allModules().map( (mod) => {

          console.log(`\n//--- Module: ${mod.name} --- `);
          // serialize all documents within this module
          //let logStatement = `Document ${doc.qualifiedName} in Module: ${mod.name}`;
          return loadAllDocuments(mod.documents)
          .then(documents => printAllDocumentsAsPromise(documents));
    }));
}

function loadAllDocuments(documents: projects.IDocument[]): when.Promise<projects.Document[]> {
  return when.all<projects.Document[]>(documents.map( (doc) => loadAsPromise(doc)));
}

function printAllDocumentsAsPromise(documents: projects.Document[]): when.Promise<void> {
  return when.all<void>(documents.map( (doc) => printModelUnitToConsole(doc)));
}

function errorHandler(error): void {
    console.error(`${Date.now()}: Something went wrong:`);
    console.error(error);
    process.exit(1);
}

function printModelUnitToConsole(unit: IModelUnit): when.Promise<void> {
  let actualJsSource = utils.serializeToJs(unit);
  return when.resolve(console.log(`//--- ${unit.qualifiedName} --- \n ${actualJsSource}`));
}

const username = `{YOUR_LOGIN}`;
const apikey = `{YOUR_API_KEY}`;
const client = new MendixSdkClient(username, apikey);

// Please change your project Id and name to something you prefer.
let projectName = `My first SDK app - Generator`;

client.platform().createNewApp(projectName)
  .then((project) => project.createWorkingCopy())
  .then((workingCopy) => printAllDocuments(workingCopy.model()))
  .done( () => console.log(`Done`), errorHandler);
