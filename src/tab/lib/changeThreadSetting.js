/// //////////////////////////////////////////////////////////////////////
// Fetch threads information used by Messenger native API. But this API //
// cannot get Messages.                                                 //
/// //////////////////////////////////////////////////////////////////////
import {
  graphql,
  getMessengerApiForm,
  generateOfflineThreadingID,
  uploadImage
} from './util'

export function changeThreadName (jar, thread, newThreadName) {
  const offlineThreadingId = generateOfflineThreadingID()
  const formData = {
    client: 'messenger',
    action_type: 'ma-type:log-message',
    ephemeral_ttl_mode: 0,
    'log_message_data[name]': newThreadName,
    log_message_type: 'log:thread-name',
    message_id: offlineThreadingId,
    offline_threading_id: offlineThreadingId,
    source: 'source:chat:web',
    thread_fbid: thread.id,
    timestamp: Date.now()
  }
  const form = getMessengerApiForm(formData, jar)
  return graphql('https://www.facebook.com/messaging/send/?dpr=1', form)
}

export function changeThreadNickname (jar, thread, participantId, nickname) {
  const formData = {
    thread_or_other_fbid: thread.id,
    participant_id: participantId,
    nickname
  }
  const form = getMessengerApiForm(formData, jar)
  return graphql('https://www.facebook.com/messaging/save_thread_nickname/?source=thread_settings&dpr=1', form)
}

export async function changeThreadImage (jar, thread, image) {
  const metadata = (await uploadImage(jar, image)).payload.metadata[0]
  const offlineThreadingId = generateOfflineThreadingID()
  console.log(metadata.src)
  const formData = {
    client: 'mercury',
    action_type: 'ma-type:log-message',
    ephemeral_ttl_mode: 0,
    'log_message_data[image][image_id]': metadata.image_id,
    'log_message_data[image][filename]': metadata.filename,
    'log_message_data[image][filetype]': metadata.filetype,
    'log_message_data[image][src]': metadata.src,
    'log_message_data[image][fbid]': metadata.fbid,
    log_message_type: 'log:thread-image',
    message_id: offlineThreadingId,
    offline_threading_id: offlineThreadingId,
    source: 'source:messenger:web',
    thread_fbid: thread.id,
    timestamp: Date.now()
  }
  const form = getMessengerApiForm(formData, jar)
  return graphql('https://www.facebook.com/messaging/send/?dpr=1', form)
}

export async function muteThread (jar, thread, muteSeconds) {
  const formData = {
    thread_fbid: thread.id,
    mute_settings: muteSeconds
  }
  const form = getMessengerApiForm(formData, jar)
  return graphql('https://www.facebook.com/ajax/mercury/change_mute_thread.php', form)
}

export const EMOJIS = ['\u270c', '\ud83d\ude02', '\ud83d\ude1d', '\ud83d\ude01', '\ud83d\ude31', '\ud83d\udc49', '\ud83d\ude4c', '\ud83c\udf7b', '\ud83d\udd25', '\ud83c\udf08', '\u2600', '\ud83c\udf88', '\ud83c\udf39', '\ud83d\udc84', '\ud83c\udf80', '\u26bd', '\ud83c\udfbe', '\ud83c\udfc1', '\ud83d\ude21', '\ud83d\udc7f', '\ud83d\udc3b', '\ud83d\udc36', '\ud83d\udc2c', '\ud83d\udc1f', '\ud83c\udf40', '\ud83d\udc40', '\ud83d\ude97', '\ud83c\udf4e', '\ud83d\udc9d', '\ud83d\udc99', '\ud83d\udc4c', '\u2764', '\ud83d\ude0d', '\ud83d\ude09', '\ud83d\ude13', '\ud83d\ude33', '\ud83d\udcaa', '\ud83d\udca9', '\ud83c\udf78', '\ud83d\udd11', '\ud83d\udc96', '\ud83c\udf1f', '\ud83c\udf89', '\ud83c\udf3a', '\ud83c\udfb6', '\ud83d\udc60', '\ud83c\udfc8', '\u26be', '\ud83c\udfc6', '\ud83d\udc7d', '\ud83d\udc80', '\ud83d\udc35', '\ud83d\udc2e', '\ud83d\udc29', '\ud83d\udc0e', '\ud83d\udca3', '\ud83d\udc43', '\ud83d\udc42', '\ud83c\udf53', '\ud83d\udc98', '\ud83d\udc9c', '\ud83d\udc4a', '\ud83d\udc8b', '\ud83d\ude18', '\ud83d\ude1c', '\ud83d\ude35', '\ud83d\ude4f', '\ud83d\udc4b', '\ud83d\udebd', '\ud83d\udc83', '\ud83d\udc8e', '\ud83d\ude80', '\ud83c\udf19', '\ud83c\udf81', '\u26c4', '\ud83c\udf0a', '\u26f5', '\ud83c\udfc0', '\ud83c\udfb1', '\ud83d\udcb0', '\ud83d\udc76', '\ud83d\udc78', '\ud83d\udc30', '\ud83d\udc37', '\ud83d\udc0d', '\ud83d\udc2b', '\ud83d\udd2b', '\ud83d\udc44', '\ud83d\udeb2', '\ud83c\udf49', '\ud83d\udc9b', '\ud83d\udc9a']

export function changeThreadEmoji (jar, thread, newEmoji) {
  const formData = {
    thread_or_other_fbid: thread.id
  }
  // If no new emoji set, Messenger will set to default emoji(thumbs up).
  if (newEmoji) {
    formData.emoji_choice = newEmoji.toLowerCase()
  }
  const form = getMessengerApiForm(formData, jar)
  return graphql('https://www.facebook.com/messaging/save_thread_emoji/?source=thread_settings&dpr=1', form)
}

export const COLORS = {
  '#0084ff': 'Messenger Blue',
  '#44bec7': 'Viking',
  '#ffc300': 'Golden Poppy',
  '#fa3c4c': 'Radical Red',
  '#d696bb': 'Shocking',
  '#6699cc': 'Picton Blue',
  '#13cf13': 'Free Speech Green',
  '#ff7e29': 'Pumpkin',
  '#e68585': 'Light Coral',
  '#7646ff': 'Medium Slate Blue',
  '#20cef5': 'Deep Sky Blue',
  '#67b868': 'Fern',
  '#d4a88c': 'Cameo',
  '#ff5ca1': 'Brilliant Rose',
  '#a695c7': 'Biloba Flower'
  // '#000000': 'Black' // Defined in Messenger page, but unuseful.
}

export function changeThreadColor (jar, thread, newColor) {
  const formData = {
    thread_or_other_fbid: thread.id
  }
  // If no new color set, Messenger will set to default color(Messenger Blue).
  if (newColor) {
    formData.color_choice = newColor.toLowerCase()
  }
  const form = getMessengerApiForm(formData, jar)
  return graphql('https://www.facebook.com/messaging/save_thread_color/?source=thread_settings&dpr=1', form)
}
