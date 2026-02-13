/*
 * This file is part of prose-app-web
 *
 * Copyright 2026, Prose Foundation
 */

/**************************************************************************
 * IMPORTS
 * ************************************************************************* */

// NPM
import Sha256 from "crypto-js/sha256";

// PACKAGE
import * as projectPackage from "@/../package.json";

// PROJECT: STORES
import Store from "@/store";

// PROJECT: UTILITIES
import logger from "@/utilities/logger";
import { platform as runtimePlatform } from "@/utilities/runtime";

// PROJECT: COMMONS
import CONFIG from "@/commons/config";

/**************************************************************************
 * ENUMERATIONS
 * ************************************************************************* */

export enum AnalyticsEventName {
  // App Heartbeat.
  AppHeartbeat = "app:heartbeat",
  // Account Signin.
  AccountSignin = "account:signin",
  // Account Signout.
  AccountSignout = "account:signout",
  // Profile Update.
  ProfileUpdate = "profile:update"
}

/**************************************************************************
 * INTERFACES
 * ************************************************************************* */

interface AnalyticsEventPayload {
  name: AnalyticsEventName;
  data?: object;
  origin: AnalyticsEventOrigin;
}

interface AnalyticsEventOrigin {
  app: AnalyticsEventOriginApp;
  pod: AnalyticsEventOriginPod;
}

interface AnalyticsEventOriginApp {
  name: string;
  version: string;
  platform: string;
}

interface AnalyticsEventOriginPod {
  domain_hash: string;
  user_hash?: string;
}

/**************************************************************************
 * CONSTANTS
 * ************************************************************************* */

const EVENT_NAME_NEXT_SEND_DELAY = 3000; // 3 seconds

const ANONYMIZED_USER_IDENTIFIER_SHORT_LENGTH = 16; // 16 characters

/**************************************************************************
 * ANALYTICS
 * ************************************************************************* */

class UtilitiesAnalytics {
  private readonly __eventOriginApp: AnalyticsEventOriginApp;

  private __eventsNextAllowedSendRegister: { [name: string]: number };

  constructor() {
    // Initialize static variables
    this.__eventOriginApp = this.__prepareEventOriginApp();

    // Initialize registers
    this.__eventsNextAllowedSendRegister = {};
  }

  event(name: AnalyticsEventName, data?: object): void {
    // User did not opt-out of analytics? Dispatch event.
    if (Store.$settings.privacy.report.tracking !== false) {
      // Notice: do not await here, since the 'event()' helper wraps \
      //   asynchronous code in synchronous-looking code. We should never wait \
      //   for an analytics event dispatch to be complete (it is pointless). We \
      //   therefore avoid developer mistakes by marking this method as \
      //   synchronous, since developers will not await it by mistake in \
      //   caller code.
      this.__dispatchEvent(name, data);
    } else {
      logger.debug(`Skipped sending analytics event: '${name}' (opted out)`);
    }
  }

  private async __dispatchEvent(
    name: AnalyticsEventName,
    data?: object
  ): Promise<void> {
    try {
      // Generate event data
      const eventData: AnalyticsEventPayload = {
        name,

        origin: this.__makeEventOrigin()
      };

      if (data !== undefined) {
        eventData.data = data;
      }

      logger.debug(`Sending analytics event: '${name}'...`, eventData);

      // Analytics are disabled by override?
      if (CONFIG.overrides?.disableAnalytics === true) {
        throw new Error("Analytics disabled by override");
      }

      // Acquire current time and next send time
      const nowTime = Date.now();

      if (nowTime < this.__eventsNextAllowedSendRegister[name] || 0) {
        throw new Error("Sending this event too frequently");
      }

      // Block next allowed send time in register (this allows for \
      //   rate-limiting to 1 event dispatch per event name, every N seconds)
      this.__eventsNextAllowedSendRegister[name] =
        nowTime + EVENT_NAME_NEXT_SEND_DELAY;

      // Send anonymized event to analytics endpoint
      // Important: if the user has opted-out of anonymous analytics, then do \
      //   not post ANY event to this endpoint (honor user choices).
      const analyticsResponse = await fetch(
        `${CONFIG.url.proseWeb}/_api/cloud/v1/analytics/event`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify(eventData),
          mode: "cors",
          credentials: "omit"
        }
      );

      if (analyticsResponse.ok !== true) {
        throw new Error("Analytics request failed");
      }

      logger.info(`Sent analytics event: '${name}'`);
    } catch (error) {
      logger.info(
        `Could not record analytics event: '${name}'`,
        (error as Error)?.message || error
      );
    }
  }

  private __makeEventOrigin(): AnalyticsEventOrigin {
    // Acquire self JID
    const selfJID = Store.$account.getSelfJID();

    // Anonymize self JID
    // Notice: use full JID as user identifier so it contains a random part
    //   (prevents re-identification).
    const domainHash = this.__anonymizeUserIdentifier(selfJID.domain),
      userHash = this.__anonymizeUserIdentifier(selfJID.toString());

    // Do we have sufficient information on the current user? Generate origin
    if (domainHash !== undefined && userHash !== undefined) {
      return {
        app: this.__eventOriginApp,

        pod: {
          domain_hash: domainHash,
          user_hash: userHash
        }
      };
    }

    throw new Error("Incomplete origin data");
  }

  private __prepareEventOriginApp(): AnalyticsEventOriginApp {
    // Acquire app name from package name, which might be namespaced, eg. \
    //   '@namespace/project-name', or directly named eg. 'project-name'.
    return Object.freeze({
      name: projectPackage.name.split("/")[1] || projectPackage.name,
      version: projectPackage.version,
      platform: runtimePlatform
    });
  }

  private __anonymizeUserIdentifier(identifier?: string): string | void {
    // Any identifier? Hash value to anonymize it, and return its short hash.
    if (identifier !== undefined && identifier.length > 0) {
      return Sha256(identifier)
        .toString()
        .slice(0, ANONYMIZED_USER_IDENTIFIER_SHORT_LENGTH);
    }

    // No identifier, do not hash an empty value!
    return undefined;
  }
}

/**************************************************************************
 * EXPORTS
 * ************************************************************************* */

export default new UtilitiesAnalytics();
