<script lang="ts" setup>
if (useUserSession().loggedIn.value === false) {
  await navigateTo('/admin/login');
}

async function logout() {
  try {
    await useUserSession().clear();
    location.reload();
  } catch (error) {
    console.error(error);
    alert('Failed to log out');
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 p-4">
    <div class="flex justify-between items-center mb-4 border-b pb-2">
      <div class="flex items-center gap-6">
        <NuxtLink to="/admin" class="text-lg font-medium text-gray-800">Admin Panel</NuxtLink>
        <nav class="flex gap-4">
          <NuxtLink 
            to="/admin" 
            class="text-sm text-gray-600 hover:text-gray-900" 
            active-class="font-semibold text-indigo-600"
            exact
          >
            Dashboard
          </NuxtLink>
          <NuxtLink 
            to="/admin/settings" 
            class="text-sm text-gray-600 hover:text-gray-900" 
            active-class="font-semibold text-indigo-600"
          >
            Settings
          </NuxtLink>
        </nav>
      </div>
      <button
        class="text-sm text-gray-600 hover:cursor-pointer hover:text-gray-900 border px-2 py-0.5 rounded"
        @click="logout"
      >
        Log out
      </button>
    </div>
    <slot />
  </div>
</template>
