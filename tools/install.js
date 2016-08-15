'use strict'

/**
 *
 * Lantube post install script
 *
 * . This script is to be executed with `npm install`
 * 
 * - Will check if a .env file exists
 * 		1) If .env file already exists, just end the script  
 * 		2) If no .env file found, will copy .env_example to .env
 * 
 */

require('colors');
let shell = require('shelljs');

shell.echo('[INFO] Installing Lantube...'.bold);

let env_found = shell.test('-f', '.env');

if ( env_found ) {
	shell.echo('[OK] .env file exists'.green);
	shell.echo('[OK] Lantube installed successfully!'.green)
	shell.echo('[INFO] Run `gulp lantube` from Lantube\'s root dir'.bold)
} else {
	shell.echo('[WARN] No .env file found, creating default...'.yellow.bold);
	shell.cp('.env_example', '.env');
	shell.echo('[OK] .env file created!'.green.bold)
}

shell.echo('[INFO] Don\'t forget to config your .env file!'.bold);

let env_example_found = shell.test('-f', '.env_example');

if ( env_example_found) {
	shell.echo('[INFO] You can delete .env_example now.'.bold);
}

shell.echo('Bye!'.green);
shell.exit(0);