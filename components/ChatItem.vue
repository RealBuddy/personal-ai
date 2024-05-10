<template>
  <div
    class="chat-item flex items-center gap-2 p-2 w-fit text-white"
    :class="
      chatItem.fromHuman ? 'flex-row-reverse self-end bg-[#111]' : 'bg-[#222]'
    "
    ref="itemRef"
  >
    <ClientOnly>
      <div
        class="bg-white text-[#111] rounded-full min-w-[1.75rem] w-7 h-7 flex items-center justify-center self-start"
      >
        <font-awesome-icon v-if="chatItem.fromHuman" icon="fa-solid fa-user" />
        <font-awesome-icon v-else icon="fa-solid fa-robot" />
      </div>
    </ClientOnly>

    <div
      class="whitespace-pre-wrap self-start markdown-content"
      :class="
        chatItem.state === 'canceled'
          ? `text-red-500 before:content-['Error:_']`
          : ''
      "
    >
      <div
        v-html="chatItem.noBuild ? chatItem.text : displayText"
        class="flex flex-col gap-1 word-break"
        :class="
          chatItem.state === 'typing' ||
          (!chatItem.noBuild && mdText.trim() !== chatItem.text.trim())
            ? `after:w-2 after:h-5 after:bg-white after:content-[''] after:flex flex after:items-end after:animate-pulse`
            : ''
        "
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import markdownIt from 'markdown-it';
import { sleep } from '~/server/utils/global.utils';

const props = defineProps<{
  chatItem: {
    text: string;
    fromHuman: boolean;
    index: number;
    state: 'finished' | 'canceled' | 'typing';
    noBuild?: boolean;
  };
}>();

const md = markdownIt();
const itemRef = ref<HTMLDivElement>();
const mdText = ref('');
const displayText = ref('');

watch(
  () => props.chatItem.text,
  async () => {
    if (props.chatItem.text && !props.chatItem.noBuild) {
      mdText.value = ''; // Reset mdText
      displayText.value = ''; // Reset displayText

      const chunks = props.chatItem.text.split(' ');

      for (const chunk of chunks) {
        await sleep(100);
        mdText.value += `${chunk} `;
        displayText.value = md.render(mdText.value);
      }
    } else {
      // Directly render markdown if no animation needed
      displayText.value = md.render(props.chatItem.text);
    }
  }
);

onMounted(() => {
  setTimeout(() => {
    itemRef.value?.scrollIntoView({
      behavior: 'smooth',
    });
  });
});
</script>

<style scoped lang="scss">
.word-break {
  word-break: break-word;
}
.markdown-content {
  p {
    margin: 0;
  }
  /* Additional styles for markdown */
}
</style>
