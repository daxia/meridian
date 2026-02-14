<script lang="ts" setup>
definePageMeta({ layout: 'admin' });

const { data, refresh, pending } = await useFetch('/api/admin/settings');

const form = ref({
  llm_provider: 'google',
  llm_model: '',
  llm_api_key: '',
  llm_base_url: '',
  article_analysis_mode: 'serial'
});

watch(data, (newData) => {
  if (newData?.settings) {
    // Only update form if data exists, preserve defaults if keys are missing
    form.value = { 
        ...form.value, 
        ...newData.settings 
    };
  }
}, { immediate: true });

async function save() {
  try {
    await $fetch('/api/admin/settings', {
      method: 'POST',
      body: form.value
    });
    alert('Settings saved successfully');
    refresh();
  } catch (e) {
    console.error(e);
    alert('Failed to save settings');
  }
}

const providers = [
  { label: 'Google Gemini', value: 'google' },
  { label: 'Zhipu AI (GLM)', value: 'glm' },
  { label: 'OpenAI Compatible', value: 'openai' },
];
</script>

<template>
  <div class="max-w-4xl mx-auto py-6">
    <h2 class="text-2xl font-bold mb-6">System Settings</h2>
    
    <div v-if="pending" class="text-gray-500">Loading...</div>
    
    <div v-else class="bg-white shadow rounded-lg p-6 space-y-8">
      
      <!-- LLM Settings -->
      <div>
        <h3 class="text-lg font-medium text-gray-900 border-b pb-2 mb-4">LLM Configuration</h3>
        <div class="grid grid-cols-1 gap-6">
          
          <!-- Provider -->
          <div>
            <label class="block text-sm font-medium text-gray-700">Provider</label>
            <select v-model="form.llm_provider" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2">
              <option v-for="p in providers" :key="p.value" :value="p.value">{{ p.label }}</option>
            </select>
            <p class="mt-1 text-sm text-gray-500">Select the AI model provider.</p>
          </div>

          <!-- Model -->
          <div>
            <label class="block text-sm font-medium text-gray-700">Model Name</label>
            <input v-model="form.llm_model" type="text" placeholder="e.g. gemini-2.0-flash-001 or glm-4-flash" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2" />
            <p class="mt-1 text-sm text-gray-500">
                Leave empty to use the provider's default model.<br>
                <span v-if="form.llm_provider === 'google'">Default: <code>gemini-2.0-flash-001</code></span>
                <span v-if="form.llm_provider === 'glm'">Default: <code>glm-4-flash</code></span>
            </p>
          </div>

          <!-- API Key -->
          <div>
            <label class="block text-sm font-medium text-gray-700">API Key</label>
            <input v-model="form.llm_api_key" type="password" placeholder="Configured in Environment Variables" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2" />
            <p class="mt-1 text-sm text-gray-500">
                Leave empty to use the value from environment variables (GEMINI_API_KEY, GLM_API_KEY, etc.).
                <span class="text-yellow-600 block mt-1">Warning: Setting this here will override the environment variable.</span>
            </p>
          </div>

          <!-- Base URL -->
          <div>
             <label class="block text-sm font-medium text-gray-700">Base URL</label>
             <input v-model="form.llm_base_url" type="text" placeholder="Optional" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2" />
             <p class="mt-1 text-sm text-gray-500">Override the default API endpoint URL.</p>
          </div>
        </div>
      </div>

      <!-- Analysis Settings -->
      <div>
        <h3 class="text-lg font-medium text-gray-900 border-b pb-2 mb-4">Analysis Settings</h3>
        <div class="grid grid-cols-1 gap-6">
          <div>
            <label class="block text-sm font-medium text-gray-700">Concurrency Mode</label>
            <select v-model="form.article_analysis_mode" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2">
              <option value="serial">Serial (Slower, Safer for Rate Limits)</option>
              <option value="parallel">Parallel (Faster)</option>
            </select>
          </div>
        </div>
      </div>

      <div class="pt-4 border-t">
        <button @click="save" class="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
          Save Settings
        </button>
      </div>

    </div>
  </div>
</template>
