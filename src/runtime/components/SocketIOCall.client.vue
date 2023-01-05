<script setup lang="ts">
import { Ref } from 'vue'
import { inject, computed, unref, watch, useSocketIOCall } from '#imports'

const props = defineProps<{
  name: string
  socket?: any
  args?: any[]
  manual?: boolean
}>()

const emit = defineEmits<{
  (e: 'start'): void
  (e: 'finish'): void
  (e: 'waiting', waiting: boolean): void
  (e: 'response', response: any): void
  (e: 'error', error: any): void
}>()

const socket = computed(() => props.socket || unref(inject('socket-io')))
const { waiting, response, error, execute } = useSocketIOCall(socket)

watch(
  [socket, () => props.name, () => props.args],
  async ([socket, name, args]) => {
    if (!socket || props.manual) return
    try {
      await execute(name, ...(args || []))
    } catch (e) {
      //
    }
  },
  { immediate: true }
)

watch(waiting as Ref<boolean>, waiting => {
  emit('waiting', waiting)
  if (waiting) {
    emit('start')
  } else {
    emit('finish')
  }
})

watch(response, response => {
  emit('response', response)
})

watch(error, error => {
  emit('error', error)
})

function callExecute() {
  try {
    return execute(props.name, ...(props.args || []))
  } catch (e) {
    //
  }
}

defineExpose({ execute: callExecute })

const bind = computed(() => ({
  waiting: unref(waiting),
  response: unref(response),
  error: unref(error),
  execute: callExecute,
}))
</script>

<template lang="pug">
slot(v-bind="bind")
</template>
