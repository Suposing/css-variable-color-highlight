<template>
  <section class="login-card">
    <h2 class="login-card__title">Driver sign in</h2>
    <p class="login-card__hint">Open this file to verify CSS variables, Sass variables, Less variables, and fallback colors.</p>
    <button class="login-card__button">Continue</button>
    <p class="login-card__danger">Less variable sample</p>
  </section>
</template>

<style scoped lang="scss">
.login-card {
  background: var(--dd-gradient-primary);
  border: 1px solid var(--dd-panel-border);
  box-shadow: var(--dd-shadow-primary-24);
  color: var(--dd-color-primary);
}

.login-card__title {
  color: $dd-primary;
}

.login-card__hint {
  color: var(--missing-login-hint, #f0f5ff);
}

.login-card__button {
  background: linear-gradient(135deg, $dd-primary 0%, $dd-primary-deep 100%);
  box-shadow: 0 12px 24px $dd-primary-shadow;
}
</style>

<style scoped lang="less">
.login-card__danger {
  color: @dd-danger;
  background: var(--dd-color-danger);
  border-color: var(--dd-color-warning);
  box-shadow: var(--dd-danger-shadow);
}
</style>
