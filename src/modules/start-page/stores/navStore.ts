import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { useUserinfoStore } from '../../userinfo/store/userinfoStore';

export const useNavStore = defineStore('nav', () => {
    const { t } = useI18n();
    const router = useRouter();

    const { routeAccessGuard } = useUserinfoStore();

    // const { hasReadAccess: hasCaseReadAccess } = useUserAccessControl({
    //   resource: WtObject.WFM,
    // });

    const isInitialized = ref(false);

    const nav = computed(() => {

        // const wfmRoutePath = '/cases';
        // const wfmRoute = router.resolve({ path: wfmRoutePath });
        // const hasCasesAccess = routeAccessGuard(wfmRoute) === true;

      const navigation = []

      return navigation;
    });

    const initializeNav = async () => {
        if (isInitialized.value) {
            return;
        }

        try {

        } finally {
            isInitialized.value = true;
        }
    };

    return { nav, initializeNav };
});
