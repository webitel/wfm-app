import { WfmSections, WtObject } from '@webitel/ui-sdk/enums';
import type { RouteRecordRaw } from 'vue-router';

import { ConfigurationNamespace } from '../../../namespace';

const ThePauseTemplates = () =>
	import('../modules/pause-templates/components/the-pause-templates.vue');
const OpenedPauseTemplate = () =>
	import('../modules/pause-templates/components/opened-pause-template.vue');
const OpenedPauseTemplateGeneral = () =>
	import(
		'../modules/pause-templates/components/opened-pause-template-general.vue'
	);
const OpenedPauseTemplateTemplate = () =>
	import(
		'../modules/pause-templates/components/opened-pause-template-template.vue'
	);

const lookupsRoutes: RouteRecordRaw[] = [
	{
		path: 'configuration/lookups',
		name: 'lookups',
		redirect: {
			name: ConfigurationNamespace,
		},
		children: [
			{
				path: 'pause-templates',
				name: WfmSections.PauseTemplates,
				component: ThePauseTemplates,
				meta: {
					WtObject: WtObject.PauseTemplate,
					UiSection: WfmSections.PauseTemplates,
				},
			},
			{
				path: 'pause-templates/:id',
				name: `${WfmSections.PauseTemplates}-card`,
				component: OpenedPauseTemplate,
				redirect: {
					name: `${WfmSections.PauseTemplates}-general`,
				},
				meta: {
					WtObject: WtObject.PauseTemplate,
					UiSection: WfmSections.PauseTemplates,
				},
				children: [
					{
						path: 'general',
						name: `${WfmSections.PauseTemplates}-general`,
						component: OpenedPauseTemplateGeneral,
					},
					{
						path: 'template',
						name: `${WfmSections.PauseTemplates}-template`,
						component: OpenedPauseTemplateTemplate,
					},
				],
			},
		],
	},
];

export default lookupsRoutes;
