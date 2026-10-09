<script setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth.js";

/** OWNER: Frontend — Shell & UI */
const auth = useAuthStore();
const router = useRouter();
const displayName = ref("");
const email = ref("");
const password = ref("");
const confirm = ref("");
const error = ref("");
const busy = ref(false);

// The server enforces the same rules; checking here just saves a round trip.
const tooShort = computed(() => password.value.length > 0 && password.value.length < 8);
const mismatch = computed(() => confirm.value.length > 0 && confirm.value !== password.value);
const canSubmit = computed(() =>
  email.value && password.value.length >= 8 && confirm.value === password.value && !busy.value);

async function submit() {
  if (!canSubmit.value) return;
  busy.value = true; error.value = "";
  try {
    await auth.register(email.value, password.value, displayName.value);
    router.push("/explore");
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
        <h1 class="h4 mb-1">Create an account</h1>
        <p class="text-muted small mb-4">Free. Lets you shortlist blocks and save your search.</p>

        <form @submit.prevent="submit" novalidate>
          <div class="mb-3">
            <label class="form-label" for="name">Name <span class="text-muted">(optional)</span></label>
            <input id="name" v-model="displayName" class="form-control" autocomplete="name" data-cy="register-name" />
          </div>
          <div class="mb-3">
            <label class="form-label" for="email">Email</label>
            <input id="email" v-model="email" type="email" class="form-control"
                   autocomplete="email" data-cy="register-email" required />
          </div>
          <div class="mb-3">
            <label class="form-label" for="password">Password</label>
            <input id="password" v-model="password" type="password" class="form-control"
                   :class="{ 'is-invalid': tooShort }" autocomplete="new-password"
                   data-cy="register-password" required />
            <div class="invalid-feedback">At least 8 characters.</div>
          </div>
          <div class="mb-3">
            <label class="form-label" for="confirm">Confirm password</label>
            <input id="confirm" v-model="confirm" type="password" class="form-control"
                   :class="{ 'is-invalid': mismatch }" autocomplete="new-password"
                   data-cy="register-confirm" required />
            <div class="invalid-feedback">Passwords don't match.</div>
          </div>
          <p v-if="error" class="text-danger small" role="alert" data-cy="register-error">{{ error }}</p>
          <button class="btn btn-primary w-100" :disabled="!canSubmit" data-cy="register-submit">
            {{ busy ? "Creating account…" : "Create account" }}
          </button>
        </form>

        <p class="small text-center text-muted mt-3 mb-0">
          Already registered? <RouterLink to="/login">Sign in</RouterLink>
        </p>
      </div>
    </div>
  </div>
</template>
