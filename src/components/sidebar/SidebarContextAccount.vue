<!--
 * This file is part of prose-app-web
 *
 * Copyright 2023, Prose Foundation
 -->

<!-- **********************************************************************
     TEMPLATE
     ********************************************************************** -->

<template lang="pug">
.c-sidebar-context-account
  base-avatar(
    v-if="type === 'user'"
    :jid="addressJID"
    size="32px"
    class="c-sidebar-context-account__avatar"
  )

  base-server-logo(
    v-else-if="type === 'server'"
    :jid="addressJID"
    :name="name"
    size="30px"
    class="c-sidebar-context-account__avatar"
  )

  .c-sidebar-context-account__identity
    p.c-sidebar-context-account__identity-main
      base-presence(
        v-if="type === 'user'"
        :jid="addressJID"
        size="small"
        class="c-sidebar-context-account__identity-presence"
      )

      span.c-sidebar-context-account__identity-name.u-bold
        | {{ name }}

    p.c-sidebar-context-account__identity-address
      | {{ address }}
</template>

<!-- **********************************************************************
     SCRIPT
     ********************************************************************** -->

<script lang="ts">
// NPM
import { JID } from "@prose-im/prose-sdk-js";

export default {
  name: "SidebarContextAccount",

  props: {
    type: {
      type: String,
      required: true,

      validator(x: string) {
        return ["user", "server"].includes(x);
      }
    },

    name: {
      type: String,
      required: true
    },

    address: {
      type: String,
      required: true
    }
  },

  computed: {
    addressJID(): JID {
      return new JID(this.address);
    }
  }
};
</script>

<!-- **********************************************************************
     STYLE
     ********************************************************************** -->

<style lang="scss">
$c: ".c-sidebar-context-account";

#{$c} {
  padding-inline-end: 26px;
  display: flex;
  align-items: center;

  #{$c}__avatar {
    margin-inline-end: 10px;
    flex: 0 0 auto;
  }

  #{$c}__identity {
    line-height: 18px;
    flex: 1;

    #{$c}__identity-main {
      display: flex;
      align-items: center;

      #{$c}__identity-presence {
        margin-inline-end: 4px;
        margin-block-start: 1px;
        flex: 0 0 auto;
      }

      #{$c}__identity-name {
        color: rgb(var(--color-text-primary));
        font-size: ($font-size-baseline - 0.5px);
        flex: 1;
      }
    }

    #{$c}__identity-address {
      color: rgb(var(--color-text-secondary));
      font-size: ($font-size-baseline - 1.5px);
    }
  }
}
</style>
