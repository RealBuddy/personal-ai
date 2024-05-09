<template>
  <div class="bg-[#333] text-white p-4 flex flex-col gap-2 relative">
    <ChatHistory class="h-full" :chat-history="chatHistory" />
    <ChatInput @send="send" />
  </div>
</template>

<script setup lang="ts">
import { sleep } from '~/server/utils/global.utils';
import { useAppStore } from '~/stores/appState';
import type { ChatItem } from '~/types/chatItem';
import type { ChatRequest } from '~/types/request';

const chatHistory = ref<ChatItem[]>([
  {
    fromHuman: false,
    index: 0,
    state: 'finished',
    text: 'How can I help you?',
    noBuild: true,
  },
]);

const appStore = useAppStore();

const send = async (message: string) => {
  if (appStore.appState !== 'ready') {
    console.warn('Bot is not ready.');
    return;
  }

  appStore.appState = 'thinking';

  chatHistory.value.push({
    text: message,
    fromHuman: true,
    index: chatHistory.value.length,
    state: 'finished',
    noBuild: true,
  });

  await sleep(250);

  chatHistory.value.push({
    text: '',
    fromHuman: false,
    index: chatHistory.value.length,
    state: 'typing',
  });

  const requestBody: ChatRequest = {
    question: message,
  };

  const { data, error } = await useFetch('/api/openAiRequest', {
    method: 'POST',
    body: requestBody,
    retry: false,
  });

  handleAIResponse(data.value, error.value);
};

const handleAIResponse = (data: any, error: any) => {
  const lastItem = chatHistory.value.at(-1);

  if (error || !data?.message) {
    const errorMessage = 'Something went wrong';
    if (lastItem) {
      lastItem.text = errorMessage;
      lastItem.state = 'canceled';
    } else {
      chatHistory.value.push({
        fromHuman: false,
        index: chatHistory.value.length,
        text: errorMessage,
        state: 'canceled',
      });
    }
    appStore.appState = 'broken';
    return;
  }

  if (lastItem) {
    lastItem.text = data.message;
    lastItem.state = 'finished';
  }

  appStore.appState = 'ready';
};

onMounted(async () => {
  appStore.appState = 'loading';
  const { data, error } = await useFetch('/api/checkIngest');
  if (error.value) {
    appStore.appState = 'broken';
  } else if (data.value?.error) {
    appStore.appState = 'broken';
  } else {
    appStore.appState = 'ready';
  }
});
</script>
