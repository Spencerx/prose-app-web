<!--
 * This file is part of prose-app-web
 *
 * Copyright 2023, Prose Foundation
 -->

<!-- **********************************************************************
     TEMPLATE
     ********************************************************************** -->

<template lang="pug">
.v-app-base
  app-sidebar(
    v-resizable.r="{ minWidth: 220, maxWidth: 300, handleWidth: 8, handleZIndex: 1 }"
    class="v-app-base__sidebar"
  )

  .v-app-base__content
    router-view
</template>

<!-- **********************************************************************
     SCRIPT
     ********************************************************************** -->

<script lang="ts">
// NPM
import {
  clearTimeout as clearWorkerTimeout,
  setTimeout as setWorkerTimeout,
  clearInterval as clearWorkerInterval,
  setInterval as setWorkerInterval
} from "worker-timers";

// PROJECT: ASSEMBLIES
import AppSidebar from "@/assemblies/app/AppSidebar.vue";

// PROJECT: UTILITIES
import {
  default as UtilitiesTracking,
  TrackingEventName
} from "@/utilities/tracking";

// CONSTANTS
const HEARTBEAT_REPORTING_TICK_INITIAL_DELAY = 30000; // 30 seconds
const HEARTBEAT_REPORTING_INTERVAL = 86400000; // 1 day

export default {
  name: "AppBase",

  components: { AppSidebar },

  data() {
    return {
      // --> STATE <--

      heartbeatReportingTickTimeout: null as null | ReturnType<
        typeof setWorkerTimeout
      >,
      heartbeatReportingInterval: null as null | ReturnType<
        typeof setWorkerInterval
      >
    };
  },

  mounted() {
    // Start reporting application heartbeat
    this.setupHeartbeatReporting();
  },

  unmounted() {
    // Stop reporting application heartbeat
    this.unsetupHeartbeatReporting();
  },

  methods: {
    // --> HELPERS <--

    async tickHeartbeatReporting(initial = false): Promise<void> {
      // Any already scheduled tick? Clear it first
      if (this.heartbeatReportingTickTimeout !== null) {
        clearWorkerTimeout(this.heartbeatReportingTickTimeout);
      }

      // Schedule this immediate tick
      // Notice #1: if this is an initial tick, then delay it a little bit, so \
      //   that we are 100% sure the application is alive and not in a \
      //   transient state switch.
      // Notice #2: we also need to use a reliable timeout scheduler here, \
      //   since this code path can be called from a reliable interval \
      //   scheduler, whilst the event loop is throttled or paused. We thus \
      //   want to make sure not to hang there by using a pausable timer to do \
      //   the final work.
      this.heartbeatReportingTickTimeout = setWorkerTimeout(
        () => {
          // Track liveness
          UtilitiesTracking.event(TrackingEventName.AppHeartbeat);
        },

        initial === true ? HEARTBEAT_REPORTING_TICK_INITIAL_DELAY : 0
      );
    },

    setupHeartbeatReporting(): void {
      if (this.heartbeatReportingInterval === null) {
        // Tick a initial heartbeat reporting
        this.tickHeartbeatReporting(true);

        // Important: use a reliable interval scheduler, that will definitely \
        //   fire whenever the event loop is put into background mode due to \
        //   user inactivity. This uses a Web Worker, which manages interval \
        //   away from the main thread and therefore is not subject to pauses.
        this.heartbeatReportingInterval = setWorkerInterval(() => {
          // Tick a heartbeat reporting
          this.tickHeartbeatReporting();
        }, HEARTBEAT_REPORTING_INTERVAL);
      }
    },

    unsetupHeartbeatReporting(): void {
      // Clear interval reporter
      if (this.heartbeatReportingInterval !== null) {
        clearWorkerInterval(this.heartbeatReportingInterval);

        this.heartbeatReportingInterval = null;
      }

      // Clear any scheduled report (from tick)
      if (this.heartbeatReportingTickTimeout !== null) {
        clearWorkerTimeout(this.heartbeatReportingTickTimeout);

        this.heartbeatReportingTickTimeout = null;
      }
    }
  }
};
</script>

<!-- **********************************************************************
     STYLE
     ********************************************************************** -->

<style lang="scss">
$c: ".v-app-base";

#{$c} {
  height: 100%;
  width: 100%;
  display: flex;
  overflow: clip;

  #{$c}__sidebar {
    border-inline-end: 1px solid rgb(var(--color-border-secondary));
    width: $size-sidebar-default-width;
    flex: 0 0 auto;

    // Hack: prevent v-resizable directive from applying its absolute position
    position: relative !important;
  }

  #{$c}__content {
    background-color: rgb(var(--color-background-primary));
    overflow: hidden;
    flex: 1;
  }
}

// --> MEDIA-QUERIES <--

@media (max-width: $size-screen-reduced-width-breakpoint) {
  #{$c} {
    #{$c}__sidebar {
      width: $size-sidebar-reduced-width;
    }
  }
}
</style>
