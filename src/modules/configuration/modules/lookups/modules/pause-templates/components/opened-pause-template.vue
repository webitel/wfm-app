<template>
  <wt-page-wrapper :actions-panel="false">
    <template #header>
      <wt-page-header
        :hide-primary="!hasSaveActionAccess"
        :primary-action="save"
        :primary-disabled="disabledSave"
        :primary-text="saveText"
        :secondary-action="close"
      >
        <wt-breadcrumb :path="path" />
      </wt-page-header>
    </template>

    <template #main>
      <wt-loader v-if="debouncedIsLoading" />
      <form
        v-else
        class="opened-card-form"
        @submit.prevent="save"
      >
        <wt-tabs
          :current="currentTab"
          :tabs="tabs"
          @change="changeTab"
        />
        <router-view v-slot="{ Component }">
          <component
            :is="Component"
            v-model="modelValue"
            :validation-fields="validationFields"
          />
        </router-view>
        <input
          hidden
          type="submit"
        > <!--  submit form on Enter  -->
      </form>
    </template>
  </wt-page-wrapper>
</template>

<script setup lang="ts">
import type { WfmPauseTemplate } from '@webitel/api-services/gen/models';
import { useCardComponent, useCardTabs } from '@webitel/ui-datalist/card';
import { useClose } from '@webitel/ui-sdk/composables';
import { WfmSections } from '@webitel/ui-sdk/enums';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { useUserAccessControl } from '../../../../../../../app/composables/useUserAccessControl';
import { usePauseTemplatesCardStore } from '../stores/card/pauseTemplatesCardStore';

const { t } = useI18n();
const { hasSaveActionAccess } = useUserAccessControl();

const {
	modelValue,
	debouncedIsLoading,
	originalItemInstance,
	isNew,
	saveText,
	disabledSave,
	validationFields,
	save,
} = useCardComponent<WfmPauseTemplate>({
	useCardStore: usePauseTemplatesCardStore,
	hasSaveAccess: hasSaveActionAccess,
});

const tabs = computed(() => [
	{
		text: t('reusable.general'),
		value: 'general',
		pathName: `${WfmSections.PauseTemplates}-general`,
	},
	{
		text: t('lookups.pauseTemplates.template'),
		value: 'template',
		pathName: `${WfmSections.PauseTemplates}-template`,
	},
]);

const { currentTab, changeTab } = useCardTabs(tabs);
const { close } = useClose(WfmSections.PauseTemplates);

const path = computed(() => [
	{
		name: t('wfm'),
		route: '/start-page',
	},
	{
		name: t('startPage.configuration.name'),
		route: '/configuration',
	},
	{
		name: t('configuration.lookups'),
		route: '/configuration',
	},
	{
		name: t('lookups.pauseTemplates.pauseTemplates', 2),
		route: '/configuration/lookups/pause-templates',
	},
	{
		name: isNew.value ? t('reusable.new') : originalItemInstance.value?.name,
	},
]);
</script>
