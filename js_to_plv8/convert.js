import * as fs from 'fs';
import * as path from 'path';
import yargs from 'yargs';

const argv = yargs(process.argv.slice(2))
  .option('d', {description: 'Add drop statements', type: 'boolean'})
  .help()
  .alias('help', 'h').argv;

const functionRoot = path.join('build', 'src', 'functions');

//* Get parameters and return type from type definition file.
function getTypes(filePath) {
  const typeContents = fs
    .readFileSync(filePath + '.d.ts', {encoding: 'utf-8'})
    .split('\n');
  const functionLine = typeContents.filter(line =>
    line.includes('declare function')
  )[0];
  if (!functionLine) {
    console.error('Could not find declare function. Did you export the function?');
    return;
  }

  const matches = functionLine.match(/function (\w+)\((.*)\): (\w+)/);
  if (matches === null) {
    console.error('Could not parse function type:', functionLine);
    return;
  }
  const funcName = matches[1];
  let params = matches[2].replace(/:/g, '');
  let returnType = matches[3];

  if (returnType === 'trigger') {
    params = '';
    returnType = 'trigger';
  }

  return {funcName, params, returnType};
}

function convertOptions(lines) {
  const options = [
    'immutable',
    'stable',
    'volatile',
    'security definer',
    'security invoker',
  ];
  if (!lines || lines.length === 0) {
    return '';
  }
  const foundOptions = options.filter(option => lines[0].includes(option));
  return ' ' + foundOptions.join(' ');
}

function getFileContents(filePath) {
  let fileContents = fs
    .readFileSync(filePath + '.js', {encoding: 'utf-8'})
    .split('\n');
  // TODO: Add check for extra imports, which aren't allowed.
  const optionsLine = fileContents.filter(line => line.includes('plv8:'));
  const options = convertOptions(optionsLine);
  // Grab just the function body
  const funcLineNum = fileContents.findIndex(line =>
    line.includes('export function')
  );
  if (funcLineNum < 0) {
    console.error(
      `${filePath}.js does not include an 'export function' statement.`
    );
    return;
  }
  fileContents = fileContents.slice(
    funcLineNum + 1,
    fileContents.lastIndexOf('}')
  );
  return {fileContents, options};
}

function convertFile(schemaName, filename) {
  // Remove .js extension
  filename = filename.slice(0, -3);
  const filePath = path.join(functionRoot, schemaName, filename);
  if (schemaName) {
    schemaName += '.';
  }
  console.log(`Converting ${filename}`);

  const {funcName, params, returnType} = getTypes(filePath);
  const {fileContents, options} = getFileContents(filePath);

  // Add plpgsql create function wrapper
  fileContents.unshift(`returns ${returnType} AS $$`);
  fileContents.unshift(
    `create or replace function ${schemaName}${funcName}(${params})`
  );
  if (argv.d) {
    fileContents.unshift(
      `drop function if exists ${schemaName}${funcName}(${params});`
    );
  }
  fileContents.push(`$$ language plv8${options};`);

  fs.writeFileSync(filePath + '.sql', fileContents.join('\n') + '\n', {
    encoding: 'utf-8',
  });
}

// Look for source files in function root and one directory level lower
const rootFiles = fs.readdirSync(functionRoot);
for (const rootFile of rootFiles) {
  const rootPath = path.join(functionRoot, rootFile);
  const stat = fs.statSync(rootPath);
  if (stat && stat.isDirectory()) {
    const schemaFiles = fs.readdirSync(rootPath);
    for (const schemaFile of schemaFiles) {
      if (schemaFile.endsWith('.js')) {
        convertFile(rootFile, schemaFile);
      }
    }
  } else if (rootFile.endsWith('.js')) {
    convertFile('', rootFile);
  }
}
