<script setup>
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth.js";
import { useShortlistStore } from "../stores/shortlist.js";
import { usePreferencesStore } from "../stores/preferences.js";

/** OWNER: Frontend — Shell & UI */
const auth = useAuthStore();
const shortlist = useShortlistStore();
const prefs = usePreferencesStore();
const router = useRouter();
const route = useRoute();
const email = ref("");
const password = ref("");
const error = ref("");
const busy = ref(false);

async function submit() {
  busy.value = true; error.value = "";
  try {
    await auth.login(email.value, password.value);
    shortlist.load();
    prefs.load();
    router.push(typeof route.query.redirect === "string" ? route.query.redirect : "/explore");
  } catch (err) {
    error.value = err.message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="container py-5 auth-card">
    <div class="card shadow-sm">
      <div class="card-body p-4">
        <h1 class="h4 mb-1">Sign in</h1>
        <p class="text-muted small mb-4">Save blocks to a shortlist and keep your filters between visits.</p>

        <form @submit.prevent="submit">
          <div class="mb-3">
            <label class="form-label" for="email">Email</label>
            <input id="email" v-model="email" type="email" class="form-control"
                   autocomplete="email" data-cy="login-email" required />
          </div>
          <div class="mb-3">
            <label class="form-label" for="password">Password</label>
            <input id="password" v-model="password" type="password" class="form-control"
                   autocomplete="current-password" data-cy="login-password" required />
          </div>
          <p v-if="error" class="text-danger small" role="alert" data-cy="login-error">{{ error }}</p>
          <button class="btn btn-primary w-100" :disabled="busy" data-cy="login-submit">
            {{ busy ? "Signing in…" : "Sign in" }}
          </button>
        </form>

        <p class="small text-center text-muted mt-3 mb-0">
          New here? <RouterLink to="/register" data-cy="to-register">Create an account</RouterLink>
        </p>
      </div>
    </div>
  </div>
</template>
