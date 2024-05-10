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
      class="whitespace-pre-wrap self-start"
      :class="
        chatItem.state === 'canceled'
          ? `text-red-500 before:content-['Error:_']`
          : ''
      "
    >
      <div
        v-html="chatItem.noBuild ? chatItem.text : displayText"
        class="markdown-content"
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
        await sleep(20);
        mdText.value += `${chunk} `;
        displayText.value = md.render(
          mdText.value +
            (props.chatItem.state === 'typing' ||
            (!props.chatItem.noBuild &&
              mdText.value.trim() !== props.chatItem.text.trim())
              ? '_'
              : '')
        );
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

:deep(.markdown-content) {
  white-space: normal;

  p {
    margin: 1rem;
  }
  ul {
    list-style-type: disc;
    padding-left: 1.5rem;
    margin-top: 1rem;
    margin-bottom: 1rem;
  }
  ol {
    list-style-type: decimal;
    padding-left: 1.5rem;
    margin-top: 1rem;
    margin-bottom: 1rem;
  }
  li {
    margin-bottom: 0.5rem;
    color: #f8f8f2;
  }
  strong {
    font-weight: bold;
  }
  em {
    font-style: italic;
  }
  blockquote {
    margin: 0 0 1rem;
    padding: 0.5rem 1rem;
    background-color: #f5f5f5;
    border-left: 3px solid #ccc;
  }
  pre {
    background-color: #333;
    color: #f8f8f2;
    padding: 1rem;
    overflow: auto;
    border-radius: 5px;
  }
}

.cursor-effect {
  &::after {
    content: '';
    display: inline-block;
    width: 2px;
    height: 1em;
    background: white;
    margin-left: 2px;
    animation: blink 1s step-end infinite;
  }
}
</style>
