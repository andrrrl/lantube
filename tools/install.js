'use strict'

/**
 *
 * Lantube post install script
 * Author: Andrrr <andresin@gmail.com>
 *
 * . This script is meant to be executed as a postinstall of `npm install`
 * 
 * - Will check if a .env file exists
 * 		1) If .env file already exists, will just end the script  
 * 		2) If no .env file found, will copy .env_example to .env without example comments
 * 
 */

require('colors');
let shell = require('shelljs');

shell.echo('[INFO] Installing Lantube...'.bold);

let wd = shell.pwd().stdout;
wd = wd.slice(wd.lastIndexOf('/'));

if ( wd === '/tools' && process.argv[2] !== 'test' ) {
	shell.echo('[ERR] Don\'t run this script standalone.'.red.bold);
	shell.echo('[ERR] Use `npm install` from root directory instead.'.red.bold);
	shell.exit(1);
}

// bool
let env_found = shell.test('-f', '.env');

if ( env_found ) {
	
	shell.echo('[OK] .env file exists'.green.bold);
	shell.echo('[OK] Lantube installed successfully!'.green.bold);
	shell.echo('[INFO] Run `gulp lantube` from Lantube\'s root dir'.bold);
	
} else {
	
	shell.echo('[WARN] No .env file found, trying to generate default...'.yellow.bold);
	
	// do we have an .env_example file?
	let env_example_found = shell.test('-f', '.env_example');
	
	if ( env_example_found ) {
		shell.echo('[INFO] .env_example file found.'.bold);
		
		// Create our brand new .env file!
		var env_created = shell.cp('.env_example', '.env');
	
		if ( env_created ){
			shell.echo('[INFO] Generating file...'.bold);
			
			// Remove example comments
			shell.exec('cat .env | grep -vP \'(\# \\(?\\!)\' > .env', { silent:true }, function(code, stdout, stderr){
				shell.echo('[OK] .env file created!'.green.bold);
				shell.echo('[INFO] You can delete .env_example now.'.bold);
				shell.echo('[INFO] Don\'t forget to check your config in .env file!'.bold);
				shell.exit(code);
			});
			
			
		} else {
			shell.echo('[ERR] Cannot create .env file'.red.bold);
		}
		
	} else {
		shell.echo('[ERR] .env_example file not found. See README.md for more info.'.red.bold);
		shell.exit(1);
	}
	
}
