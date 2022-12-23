# PLV8 Converter

This project converts Typescript functions into [PLV8](https://plv8.github.io/)
functions.

## Features

* Type checking, linting, prettier.
* Code will be correctly highlighted by editors.
* Automatically adds "create function" wrapper with correct parameters and
  return type.
* Supports trigger functions.

## Limitations

* No support for including external packages.

## Install

`npm run install`

## Writing functions

Add Typescript functions to the `src/functions` directory, one function per file. Be
sure to export the function with `export function`.

To define functions in a schema (other than the default "public") create a
subdirectory in src/functions. [This example](src/functions/private/sample_send_email.ts)
will be defined in the `private` schema.

Use the type names from the 'plv8' package to define parameters and return types.
Call plv8 functions and optionally add type definitions, for example:

```
  const template_id = plv8.execute<{value: string}>(
        "select value from private.keys where key = 'EMAIL_TEMPLATE_PROMOTE_ATTENDEE'"
      )[0].value;
```

will cast the return value as `{value: string}[]`. More examples in the
[function sample](src/functions/sample_function.ts).

## Converting

To convert the Typescript functions into SQL statements use
`npm run convert`. The results will be in `build/src/functions/**.sql`.

To add `DROP` statements use `npm run convert -- -d`.

## Trigger functions

To write a trigger function, return `trigger<MyTableRow>` where MyTableRow defines the
type of the row for the trigger. You can also add a NEW parameter for insert and update
triggers, and OLD for update and delete triggers.

```
export function sample_trigger(
  NEW: MyTableRow,
  OLD: MyTableRow
): trigger<MyTableRow> { ... }
```

See [sample trigger](src/functions/sample_trigger.ts) for more details.

## Function options

To add `security definer`, `immutable`, or `stable` to the function definition, add a
comment in the function that starts with `plv8:`. For example:

```
// plv8: security definer, immutable
```

## Lint

Run `npm run lint` or `npm run fix` to lint or fix the formattings for the functions. This
package is using the [Google Typescript Style](https://github.com/google/gts).

## Testing

TODO: Add example of testing the functions.
