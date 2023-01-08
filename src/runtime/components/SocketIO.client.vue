<script setup lang="ts">
import type { SocketOptions } from 'socket.io-client'
import { provide, shallowRef, useNuxtApp, watch } from '#imports'

const props = defineProps<{
  url?: string
  options?: SocketOptions
}>()

const emit = defineEmits<{
  (e: 'update:socket', socket?: any): void
  (e: 'changed', socket?: any): void
}>()

const socketRef = shallowRef<any>()

watch(
  [() => props.url, () => props.options],
  ([url, options]) => {
    socketRef.value = useNuxtApp().$io(url, options)
  },
  { deep: true, immediate: true }
)

watch(
  socketRef,
  socket => {
    emit('update:socket', socket)
    emit('changed', socket)
  },
  { immediate: true }
)

provide('socket-io', socketRef)
</script>

<template lang="pug">
slot(:socket="socketRef")
</template>
