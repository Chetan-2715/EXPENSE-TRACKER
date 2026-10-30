import { Injectable } from '@angular/core';
import $ from 'jquery';

@Injectable({
  providedIn: 'root'
})
export class JqueryService {
  /**
   * Display an animated notification toast using jQuery slideDown & fadeOut
   */
  showToast(title: string, message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info'): void {
    const toastId = 'jq-toast-' + Date.now();
    const iconClass = type === 'success' ? 'bi-check-circle-fill' :
                      type === 'error' ? 'bi-exclamation-triangle-fill' :
                      type === 'warning' ? 'bi-exclamation-circle-fill' : 'bi-info-circle-fill';
    
    const toastHtml = `
      <div id="${toastId}" class="jq-toast jq-toast-${type}">
        <div class="jq-toast-icon"><i class="bi ${iconClass}"></i></div>
        <div class="jq-toast-content">
          <div class="jq-toast-title">${title}</div>
          <div class="jq-toast-message">${message}</div>
        </div>
        <button type="button" class="jq-toast-close" data-id="${toastId}">&times;</button>
      </div>
    `;

    let $container = $('#jq-toast-container');
    if ($container.length === 0) {
      $('body').append('<div id="jq-toast-container"></div>');
      $container = $('#jq-toast-container');
    }

    const $toast = $(toastHtml).hide();
    $container.append($toast);
    $toast.slideDown(250);

    const timeout = setTimeout(() => {
      $toast.fadeOut(300, () => $toast.remove());
    }, 3500);

    $toast.find('.jq-toast-close').on('click', () => {
      clearTimeout(timeout);
      $toast.slideUp(200, () => $toast.remove());
    });
  }

  /**
   * Smoothly flash an element with a glowing pulse
   */
  pulseElement(selector: string): void {
    const $el = $(selector);
    if ($el.length) {
      $el.addClass('jq-pulse-highlight');
      setTimeout(() => {
        $el.removeClass('jq-pulse-highlight');
      }, 1500);
    }
  }

  /**
   * Shake an element on validation error
   */
  shakeElement(selector: string): void {
    const $el = $(selector);
    if ($el.length) {
      $el.addClass('jq-shake');
      setTimeout(() => {
        $el.removeClass('jq-shake');
      }, 500);
    }
  }

  /**
   * Toggle collapsible accordion panel using jQuery slideToggle
   */
  toggleAccordion(triggerSelector: string, contentSelector: string): void {
    $(contentSelector).slideToggle(200);
    $(triggerSelector).toggleClass('expanded');
  }
}
