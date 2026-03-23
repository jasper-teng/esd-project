import { ref, computed } from 'vue'

const notifications = ref([
  { id: 1, title: 'Tap-in successful', message: 'You tapped in at NS1 Jurong East.', time: '2 min ago', unread: true },
  { id: 2, title: 'Auto Top-Up triggered', message: '$10.00 was added to your wallet.', time: '15 min ago', unread: true },
  { id: 3, title: 'Concession approved', message: 'Your student concession is now active.', time: '1 hour ago', unread: true },
  { id: 4, title: 'Trip completed', message: 'Fare of $1.42 deducted. Balance: $8.58.', time: 'Yesterday', unread: false },
])

let nextId = 5

const unread = computed(() => notifications.value.filter(n => n.unread).length)

function addNotification(title, message) {
  notifications.value.unshift({
    id: nextId++,
    title,
    message,
    time: 'Just now',
    unread: true,
  })
}

function markRead(n) { n.unread = false }
function markAllRead() { notifications.value.forEach(n => n.unread = false) }

export function useNotifications() {
  return { notifications, unread, addNotification, markRead, markAllRead }
}
