# GitHub Packages auth

The `@graffhyrum/crap4ts` package is restricted on GitHub Packages.

Put a GitHub token with `read:packages` in `~/.npmrc` for `npm.pkg.github.com`.

Also set:

```
@graffhyrum:registry=https://npm.pkg.github.com
```

Do not invent a token. Use a token the user already has or create one in GitHub settings.
