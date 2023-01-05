<script setup lang="ts">
import { computed, inject, watch, unref, shallowRef } from '#imports'

const props = defineProps<{
  name: string
  socket?: any
}>()

const emit = defineEmits<{
  (e: 'emit', message: any): void
}>()

const message = shallowRef()
const socket = computed(() => props.socket || unref(inject('socket-io')))

function onEmit(_message: any) {
  emit('emit', _message)
  message.value = _message
}

watch(
  [socket, () => props.name],
  ([socket, name], [_, oldName]) => {
    if (!socket) return
    if (name !== oldName) {
      socket.off(oldName, onEmit)
    }
    socket.on(name, onEmit)
  },
  { immediate: true }
)
</script>

<template lang="pug">
slot(:message="message")
</template>
