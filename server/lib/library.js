const walk      = require("walkdir");
const path      = require('path');
const S         = require('string');
const PouchDB   = require('pouchdb');
const nconf     = require('nconf');
const _         = require('lodash');
const fs 				= require("fs");
const jsonfile	= require('jsonfile');

const db    = new PouchDB('covers');

//Update internal index during testing...
let path_to_library = path.join(__dirname, '../../tests/archives')
let archives = index_files(path_to_library);
let covers = index_covers(archives);

const {cover}   = require('./archive');

const path_to_conf = path.join(__dirname, '../../config/app.json');
nconf.argv()
	 .env()
	 .file(path_to_conf);

/*
 Return a list of all libraries on the system
 */
module.exports.model = function(){

}

module.exports.cover = function(){
	return db.allDocs().then( docs => {
		return db.getAttachment('spidey.cbr', 'cover.jpg')
	});
}

module.exports.index = function(directory){

		let folders = index_folders(directory);
		let files   = index_files(directory);


		const path_to_model = path.join(__dirname, '../data/model.json');
		jsonfile.writeFileSync(path_to_model, {folders, files}, {spaces: 4} );

		return index_covers( files );

}

/*
 Return a nested structure of directory objects of the form:
 {
 		name
		directory
		folders:  []
 }
 */
function index_folders(directory){

	let name = path.basename(directory);


	let contents = scan_directory(directory);
	let folders = contents.folders.map(folder => {
		return index_folders(folder);
	})
	return {name, directory, folders};

}

/*
 Return a flat array of all files in the directory (including sub directory)
 */
function index_files(directory){

	let contents = scan_directory(directory);

	let files = _.reduce(contents.folders, function(files, folder){
			return  _.concat(files, index_files(folder));
	}, contents.files)

	return files;
}



/*
 Walk the directory structure, adding all covers to the database
 */
function index_covers( files ){

	//Get all covers currently in database
	return db.allDocs().then(doc =>{

		let covers = doc.rows.map(row => row.id);

		let queued  = files.filter(file => {
			return !_.includes(covers, path.basename(file) );
		})

		debugger;

		//Add new issues, one at a time
		return _.reduce(queued, function(p, file){
			return index_cover(file);
		}, Promise.resolve() )

	})
}

/*
 Extract the cover from a given archive and file it in pouchdb
 */
 function index_cover(file){
	 let image 	= cover(file);
	 let key 		= path.basename(file);
	 return db.putAttachment(key, 'cover.jpg', image, 'test/jpg').then(result=>{
		 console.log(`Added cover ${key} to database`);
	 }, err => {
		 console.error(`Error adding cover ${key} to database, ${err.message}`);
		 return Promise.resolve(err);
	 })
 }

/*
 Return fully qualified paths for all  useful files in a directory
 {
 	files: []
	folders: []
 }
 */
function scan_directory(directory){

	let catalog_model = fs.readdirSync( directory );

	console.log(`Scanning folder: ${directory}`);

	//Remove system generated directories / thumbnails
	catalog_model = catalog_model.filter(entry => {
		return !S(entry).startsWith('.') && !S(entry).startsWith('_');
	})

	//Map basename to fully qualified path names
	catalog_model = catalog_model.map( entry => {
		return path.join(directory, entry);
	})

	//Seperate out files and folders
	let files = catalog_model.filter(entry => {
			return fs.statSync(entry).isFile();
	})

	let folders = catalog_model.filter(entry => {
			return fs.statSync(entry).isDirectory();
	})

	return {files, folders};

}
