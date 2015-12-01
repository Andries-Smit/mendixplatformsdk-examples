///<reference path="typings/tsd.d.ts" />

import { MendixSdkClient, Project, OnlineWorkingCopy, Revision } from "mendixplatformsdk";
import { ModelSdkClient, IModel, projects, domainmodels, microflows, pages, navigation, texts } from "mendixmodelsdk";

import { MendixModelComponents} from "mendixmodelcomponents";

import when = require('when');

const readlineSync = require('readline-sync');

/*
 * CREDENTIALS
 */
const username = "{USERNAME}";
const apikey = "{API KEY}";

const appname = "GeneratedApp-" + Date.now();

/*
 *
 * Existing content
 *
 */

const desktopLayoutName = 'NavigationLayouts.Sidebar_Full_Responsive'
const desktopLayoutPlaceholderName = 'Content';

/*
 *
 * New content
 *
 */

const myFirstModuleName = 'MyFirstModule';

const customerEntityName = 'Customer';
const customerNumberAttributeName = 'Number';
const invoiceEntityName = 'Invoice';
const invoiceNumberAttributeName = 'Number';
const invoiceTimestampAttributeName = 'Timestamp';
const invoiceLineEntityName = 'InvoiceLine';
const invoiceLineProductAttributeName = 'Product';

const client = new MendixSdkClient(username, apikey);

client.platform()
	.createNewApp(appname)
	.then(project => {
		myLog(`Created new project: ${project.id() }: ${project.name() }`);
		readlineSync.question("About to create online working copy. Press [ENTER] to continue ... ");

		return project.createWorkingCopy();
	})
	.then(workingCopy => {
		const components = new MendixModelComponents(workingCopy.model());
		
		myLog(`Created working copy: ${workingCopy.id() }`);
		readlineSync.question("About to generate a domain model. Press [ENTER] to continue ... ");

		return generateApp(workingCopy, components);
	})
	.then(workingCopy => {
		readlineSync.question("About to commit changes back to the Team Server. Press [ENTER] to continue ... ");
		return workingCopy.commit();
	})
	.done(
	() => {
		myLog("Done. Check the result in the Mendix Business Modeler.");
	},
	error => {
		console.log("Something went wrong:");
		console.dir(error);
	});

function generateApp(workingCopy: OnlineWorkingCopy, components: MendixModelComponents): when.Promise<OnlineWorkingCopy> {
	console.log("Generating app model...");

	const module = workingCopy.model()
		.allModules()
		.filter(m => m.name === myFirstModuleName)[0];

	return createDomainModel(module, components)
		.then(module => createPages(workingCopy.model(), module, components))
		.then(module => createMicroflows(module, components))
		.then(module => updateNavigation(workingCopy.model(), module))
		.then(_ => console.log(`Generated app model successfully.`))
		.then(_ => workingCopy);
}

/*
 *
 * UTILITIES
 *
 */

function myLog(message, ...optionalParams: any[]): void {
	console.log(`${Date.now() }: ${message} ${optionalParams}`);
}

interface Loadable<T> {
	load(callback: (result: T) => void): void;
}

function loadAsPromise<T>(loadable: Loadable<T>): When.Promise<T> {
	return when.promise<T>((resolve, reject) => loadable.load(resolve));
}

/*
 *
 * DOMAIN MODEL
 *
 */

function createDomainModel(module: projects.IModule, components: MendixModelComponents): when.Promise<projects.IModule> {
	myLog('Creating domain model ...');

	return loadAsPromise(module.domainModel)
		.then(domainModel => {
			let customer = components.createEntity(domainModel, customerEntityName, 100, 100);
			components.addAutoNumberAttribute(customer, customerNumberAttributeName, '1');
			components.addStringAttribute(customer, 'FirstName');
			components.addDateTimeAttribute(customer, 'SignupDate');
			components.addStringAttribute(customer, 'LastName');
			components.addStringAttribute(customer, 'Email');
			components.addStringAttribute(customer, 'Address');

			let invoice = components.createEntity(domainModel, invoiceEntityName, 400, 100);
			components.addAutoNumberAttribute(invoice, invoiceNumberAttributeName, '1');
			components.addDateTimeAttribute(invoice, invoiceTimestampAttributeName);

			let invoiceLine = components.createEntity(domainModel, invoiceLineEntityName, 700, 100);
			components.addStringAttribute(invoiceLine, invoiceLineProductAttributeName);
			components.addIntegerAttribute(invoiceLine, 'Quantity');

			components.associate(domainModel, invoice, customer, 'Invoices');
			components.associate(domainModel, invoiceLine, invoice, 'Lines');

			myLog('Created domain model.');

			return module;
		});
}

/*
 *
 * PAGES
 *
 */

function createPages(project: IModel, module: projects.IModule, components: MendixModelComponents): when.Promise<projects.IModule> {
	myLog('Creating new pages ...');

	return components.retrieveLayout(project, desktopLayoutName)
		.then(desktopLayout => {
			return loadAsPromise(module.domainModel)
				.then(domainModel => {
					let entities = domainModel.entities
						.filter(e => e.name === customerEntityName
							|| e.name === invoiceEntityName
							|| e.name === invoiceLineEntityName);

					entities.forEach(entity => {
						let editPage = components.createEditPageForEntity(entity, desktopLayout, desktopLayoutPlaceholderName);
						components.createListPageForEntity(entity, sortAttributeForEntity(entity), desktopLayout, desktopLayoutPlaceholderName, editPage);
					});

					myLog('New pages created.');

					return module;
				});
		});
}

function sortAttributeForEntity(entity: domainmodels.Entity): domainmodels.Attribute {
	if (entity.qualifiedName === myFirstModuleName + '.' + customerEntityName) {
		let attributes = entity.attributes.filter(a => a.name === customerNumberAttributeName);

		if (attributes.length >= 1) {
			return attributes[0];
		} else {
			return null;
		}
	} else if (entity.qualifiedName === myFirstModuleName + '.' + invoiceEntityName) {
		let attributes = entity.attributes.filter(a => a.name === invoiceTimestampAttributeName);

		if (attributes.length >= 1) {
			return attributes[0];
		} else {
			return null;
		}
	} else if (entity.qualifiedName === myFirstModuleName + '.' + invoiceLineEntityName) {
		let attributes = entity.attributes.filter(a => a.name === invoiceLineProductAttributeName);

		if (attributes.length >= 1) {
			return attributes[0];
		} else {
			return null;
		}
	}
}

/*
 *
 * NAVIGATION
 *
 */

function updateNavigation(project: IModel, module: projects.IModule): when.Promise<projects.IModule> {
	const targetPage: pages.Page = null;

	return when.promise<projects.IModule>((resolve, reject) => {
		let navDoc = project.allNavigationDocuments()[0];

		navDoc.load(navdoc => {
			navdoc.desktopProfile.homePage = navigation.HomePage.create(project);
			navdoc.desktopProfile.homePage.page = targetPage;

			resolve(module);
		});
	});
}

/*
 *
 * MICROFLOWS
 *
 */

let newMicroflowName = 'MyFirstNewMicroflow';

function createMicroflows(module: projects.IModule, components: MendixModelComponents): projects.IModule {
	myLog('Creating microflow ...');

	createExampleMicroflow(module, components);

	myLog('Microflow created.');

	return module;
}

function createExampleMicroflow(module: projects.IModule, components: MendixModelComponents) {
	let customer = module.domainModel.entities.filter(e => e.name === customerEntityName)[0];
	let invoice = module.domainModel.entities.filter(e => e.name === invoiceEntityName)[0];

	let microflow = components.createMicroflow(module, newMicroflowName);

	let parameterName = customerEntityName + 'Input';

	let parameter = components.createParameter(parameterName, customer.qualifiedName);
	components.addObjectToMicroflow(microflow, microflow.objectCollection, parameter, null);

	let previousObject = components.addObjectToMicroflow(microflow, microflow.objectCollection, components.createStartEvent(), null);

	let invoicesAssoc = module.domainModel.associations.filter(a => a.name === 'Invoices')[0];
	let retrieveByAssocActivity = components.createRetrieveByAssociationActivity(parameter.name, invoicesAssoc);
	previousObject = components.addObjectToMicroflow(microflow, microflow.objectCollection, retrieveByAssocActivity, previousObject);

	let endEvent = components.createEndEvent(microflow, "[" + invoice.qualifiedName + "]",
		"$" + (<microflows.RetrieveAction>retrieveByAssocActivity.action).outputVariableName);
	previousObject = components.addObjectToMicroflow(microflow, microflow.objectCollection, endEvent, previousObject, false);
}
