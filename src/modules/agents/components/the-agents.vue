<template>My Schedules</template>

<script setup lang="ts">
import { AgentAbsenceAPI } from '@webitel/api-services/api'
import { onMounted } from 'vue'

onMounted(() => {
  AgentAbsenceAPI.getList({
    q: 'test',
    page: 1,
  })
})
</script>
