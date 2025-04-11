
This is a [codemod](https://codemod.com) created with [```codemod init```](https://docs.codemod.com/deploying-codemods/cli#codemod-init).

## Using this codemod
You can run this codemod with the following command:
```bash
npx codemod angular
```


### Before
```html
<button (click)="toggleDescriptionClick()" mat-button color="accent"
  class="rkt-ButtonLink rkt-ButtonLink--is-small todo-item-hint-button" [attr.data-rmqa]="'toDo-card--showDescription'">
  <span color="test" class="rkt-Body-16 rkt-Spacing--mh0">{{
    content.viewDescriptionLabel
    }}</span>
  <mat-icon svgIcon="expand_more-default" iconPositionEnd class="rkt-ButtonLink__icon"></mat-icon>
</button>
```

### After
```html
<button (click)="toggleDescriptionClick()" class="todo-item-hint-button" [attr.data-rmqa]="'toDo-card--showDescription'"
  rkt-button variant="accent" size="sm">
  <span color="test" class="rkt-Body-16 rkt-Spacing--mh0">{{
    content.viewDescriptionLabel
    }}</span>
  <mat-icon svgIcon="expand_more-default" iconPositionEnd class="rkt-ButtonLink__icon"></mat-icon>
</button>
```

