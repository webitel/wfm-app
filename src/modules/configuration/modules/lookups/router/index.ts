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

const TheShiftTemplates = () =>
	import('../modules/shift-templates/components/the-shift-templates.vue');
const OpenedShiftTemplate = () =>
	import('../modules/shift-templates/components/opened-shift-template.vue');
const OpenedShiftTemplateGeneral = () =>
	import(
		'../modules/shift-templates/components/opened-shift-template-general.vue'
	);
const OpenedShiftTemplateTemplate = () =>
	import(
		'../modules/shift-templates/components/opened-shift-template-template.vue'
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
			{
				path: 'shift-templates',
				name: WfmSections.ShiftTemplates,
				component: TheShiftTemplates,
				meta: {
					WtObject: WtObject.ShiftTemplate,
					UiSection: WfmSections.ShiftTemplates,
				},
			},
			{
				path: 'shift-templates/:id',
				name: `${WfmSections.ShiftTemplates}-card`,
				component: OpenedShiftTemplate,
				redirect: {
					name: `${WfmSections.ShiftTemplates}-general`,
				},
				meta: {
					WtObject: WtObject.ShiftTemplate,
					UiSection: WfmSections.ShiftTemplates,
				},
				children: [
					{
						path: 'general',
						name: `${WfmSections.ShiftTemplates}-general`,
						component: OpenedShiftTemplateGeneral,
					},
					{
						path: 'template',
						name: `${WfmSections.ShiftTemplates}-template`,
						component: OpenedShiftTemplateTemplate,
					},
				],
			},
		],
	},
];

export default lookupsRoutes;
