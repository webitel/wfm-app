<template>
  <!-- [Claude] A yes / no question the WFM pages await: `const isYes = await confirmPopup.ask(...)`.
       Used for "delete the shifts?", "fill unplanned days with days off?", deletions, refusals. -->
  <wt-popup
    :shown="!!question"
    size="sm"
    @close="answer(false)"
  >
    <template #title>
      {{ question?.title }}
    </template>
    <template #main>
      <p
        v-if="question?.text"
        class="typo-body-1"
      >
        {{ question.text }}
      </p>
      <ul
        v-if="question?.details?.length"
        class="wfm-confirm-popup__details typo-body-2"
      >
        <li
          v-for="(detail, index) of question.details"
          :key="index"
        >
          {{ detail }}
        </li>
      </ul>
    </template>
    <template #actions>
      <wt-button
        :color="question?.isDanger ? 'error' : 'primary'"
        @click="answer(true)"
      >
        {{ question?.yes || t('vocabulary.yes') }}
      </wt-button>
      <wt-button
        v-if="!question?.isInfo"
        color="secondary"
        @click="answer(false)"
      >
        {{ question?.no || t('vocabulary.no') }}
      </wt-button>
    </template>
  </wt-popup>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue';
import { useI18n } from 'vue-i18n';

export interface ConfirmQuestion {
	title: string;
	text?: string;
	details?: string[];
	yes?: string;
	no?: string;
	isDanger?: boolean;
	// [Claude] Only tells something: one button.
	isInfo?: boolean;
}

const { t } = useI18n();

const question = shallowRef<ConfirmQuestion | null>(null);
let resolve: ((value: boolean) => void) | null = null;

const ask = (next: ConfirmQuestion): Promise<boolean> => {
	resolve?.(false);
	question.value = next;
	return new Promise((done) => {
		resolve = done;
	});
};

const answer = (value: boolean) => {
	question.value = null;
	resolve?.(value);
	resolve = null;
};

defineExpose({
	ask,
});
</script>

<style scoped>
.wfm-confirm-popup__details {
	margin-top: var(--spacing-xs);
	padding-left: var(--spacing-md);
	max-height: 240px;
	overflow: auto;
	list-style: disc;
}
</style>
