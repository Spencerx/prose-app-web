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

export enum TrackingEventName {
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

interface TrackingEventPayload {
  name: TrackingEventName;
  data?: object;
  origin: TrackingEventOrigin;
}

interface TrackingEventOrigin {
  app: TrackingEventOriginApp;
  pod: TrackingEventOriginPod;
}

interface TrackingEventOriginApp {
  name: string;
  version: string;
  platform: string;
}

interface TrackingEventOriginPod {
  domain_hash: string;
  user_hash?: string;
}

/**************************************************************************
 * CONSTANTS
 * ************************************************************************* */

const EVENT_NAME_NEXT_SEND_DELAY = 3000; // 3 seconds

const ANONYMIZED_USER_IDENTIFIER_SHORT_LENGTH = 16; // 16 characters

/**************************************************************************
 * TRACKING
 * ************************************************************************* */

class UtilitiesTracking {
  private readonly __eventOriginApp: TrackingEventOriginApp;

  private __eventsNextAllowedSendRegister: { [name: string]: number };

  constructor() {
    // Initialize static variables
    this.__eventOriginApp = this.__prepareEventOriginApp();

    // Initialize registers
    this.__eventsNextAllowedSendRegister = {};
  }

  async event(name: TrackingEventName, data?: object): Promise<void> {
    // User did not opt-out of tracking reports? Dispatch event.
    if (Store.$settings.privacy.report.tracking !== false) {
      await this.__dispatchEvent(name, data);
    } else {
      logger.debug(`Skipped sending tracking event: '${name}' (opted out)`);
    }
  }

  private async __dispatchEvent(
    name: TrackingEventName,
    data?: object
  ): Promise<void> {
    try {
      // Generate event data
      const eventData: TrackingEventPayload = {
        name,

        origin: this.__makeEventOrigin()
      };

      if (data !== undefined) {
        eventData.data = data;
      }

      logger.debug(`Sending tracking event: '${name}'...`, eventData);

      // Tracking is disabled by override?
      if (CONFIG.overrides?.disableTracking === true) {
        throw new Error("Tracking disabled by override");
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

      // Send anonymized event to tracking endpoint
      // Important: if the user has opted-out of anonymous analytics, then do \
      //   not post ANY event to this endpoint (honor user choices).
      const trackingResponse = await fetch(
        `${CONFIG.url.proseWeb}/_api/cloud/v1/track/event`,
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

      if (trackingResponse.ok !== true) {
        throw new Error("Tracking request failed");
      }

      logger.info(`Sent tracking event: '${name}'`);
    } catch (error) {
      logger.warn(`Failed tracking event: '${name}' (ignoring)`, error);
    }
  }

  private __makeEventOrigin(): TrackingEventOrigin {
    // Acquire self JID
    const selfJID = Store.$account.getSelfJID();

    // Anonymize self JID
    const domainHash = this.__anonymizeUserIdentifier(selfJID.domain),
      userHash = this.__anonymizeUserIdentifier(selfJID.node);

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

  private __prepareEventOriginApp(): TrackingEventOriginApp {
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

export default new UtilitiesTracking();
