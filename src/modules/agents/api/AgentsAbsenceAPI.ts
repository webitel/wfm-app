import {
  getDefaultGetListResponse,
} from '@webitel/api-services/api/defaults';
import { applyTransform,
  merge,
  notify,
  snakeToCamel,
} from '@webitel/api-services/api/transformers';

const getAgentsAbsenceList = async (params) => {
  const fieldsToSend = [
    'page',
    'size',
    'q',
    'ids',
    'sort',
    'fields',
    'filters',
  ];
  try {
    // TODO Implement get list from api
    const response = { data: [] }

    const { items, next } = applyTransform(response.data, [
      merge(getDefaultGetListResponse()),
    ]);
    return {
      items: applyTransform(items, [snakeToCamel()]),
      next,
    };
  } catch (err) {
    throw applyTransform(err, [notify]);
  }
};

const AgentsAbsenceAPI = {
  getList: getAgentsAbsenceList,
};

export default AgentsAbsenceAPI;
