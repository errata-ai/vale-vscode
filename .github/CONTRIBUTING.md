# Publishing a release

See [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension).

```console
$ npm run webpack
$ vsce package
# This handles bumping the version:
$ vsce publish minor
```

Then cut a new GitHub release.
