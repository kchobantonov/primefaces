/**
 * __PrimeFaces CascadeSelect Widget__
 * 
 * CascadeSelect CascadeSelect displays a nested structure of options.
 * 
 * @interface {PrimeFaces.widget.CascadeSelectCfg} cfg The configuration for the {@link  CascadeSelect| CascadeSelect widget}.
 * You can access this configuration via {@link PrimeFaces.widget.BaseWidget.cfg|BaseWidget.cfg}. Please note that this
 * configuration is usually meant to be read-only and should not be modified.
 * @extends {PrimeFaces.widget.BaseWidgetCfg} cfg
 * 
 * @prop {JQuery} input The DOM element for the hidden input with the current value.
 * @prop {JQuery} label The DOM element for the label indicating the currently selected option.
 * @prop {JQuery} triggers The DOM elements for the buttons that can trigger (hide or show) the overlay panel with the
 * available selectable options.
 * @prop {JQuery} panel The DOM element for the overlay panel with the available selectable options.
 * @prop {JQuery} itemsWrapper The DOM element for the wrapper with the container with the available selectable
 * options.
 * @prop {JQuery} items The DOM elements for the the available selectable options.
 * @prop {JQuery} contents The DOM element for the content in the available selectable options.
 * @prop {boolean} cfg.disabled If true, disables the component.
 * @prop {string} cfg.appendTo Appends the overlay to the element defined by search expression. Defaults to the document
 * body.
 */
PrimeFaces.widget.CascadeSelect = PrimeFaces.widget.BaseWidget.extend({

    /**
     * @override
     * @inheritdoc
     * @param {PrimeFaces.PartialWidgetCfg<TCfg>} cfg
     */
    init: function(cfg) {
        this._super(cfg);
        
        this.input = $(this.jqId + '_input');
        this.label = this.jq.children('.ui-cascadeselect-label');
        this.triggers = this.jq.children('.ui-cascadeselect-trigger').add(this.label);
        this.panel = $(this.jqId + '_panel');
        this.itemsWrapper = this.panel.children('.ui-cascadeselect-items-wrapper');
        this.items = this.itemsWrapper.find('li.ui-cascadeselect-item');
        this.contents = this.items.children('.ui-cascadeselect-item-content');
        this.cfg.disabled = this.jq.hasClass('ui-state-disabled');
        this.cfg.appendTo = PrimeFaces.utils.resolveAppendTo(this);
        
        if (!this.cfg.disabled) {
            this.bindEvents();
            this.bindConstantEvents();
        
            PrimeFaces.utils.registerDynamicOverlay(this, this.panel, this.id + '_panel');
        }
    },
    
    /**
     * Sets up all event listeners that are required by this widget.
     * @private
     */
    bindEvents: function() {
        var $this = this;
    
        this.triggers.off('click.cascadeselect').on('click.cascadeselect', function(e) {
            if ($this.panel.is(':hidden')) {
                $this.show();
            }
            else {
                $this.hide();
            }

            $this.input.trigger('focus.cascadeselect');
            e.preventDefault();
        });
    
        this.input.off('focus.cascadeselect blur.cascadeselect keydown.cascadeselect')
            .on('focus.cascadeselect', function() {
                $this.jq.addClass('ui-state-focus');
            })
            .on('blur.cascadeselect', function(){
                $this.jq.removeClass('ui-state-focus');
            })
            .on('keydown.cascadeselect', function(e) {
                var keyCode = $.ui.keyCode,
                key = e.which;
        
                switch(key) {
                    case keyCode.DOWN:
                        if ($this.panel.is(':visible')) {
                            $this.panel.find('.ui-cascadeselect-item:first > .ui-cascadeselect-item-content').focus();
                        }
                        else if (e.altKey) {
                            $this.show();
                        }
                        e.preventDefault();
                        break;
        
                    case keyCode.ESCAPE:
                        if ($this.panel.is(':visible')) {
                            $this.hide();
                            e.preventDefault();
                        }
                        break;
        
                    case keyCode.TAB:
                        $this.hide();
                        break;
        
                    default:
                        break;
                }
            });
    
        this.contents.off('click.cascadeselect keydown.cascadeselect')
            .on('click.cascadeselect', function(e) {
                var item = $(this).parent();
                var subpanel = item.children('.ui-cascadeselect-panel');

                $this.deactivateItems(item);
                item.addClass('ui-cascadeselect-item-active ui-state-highlight');
                
                if (subpanel.length > 0) {
                    var parentPanel = item.closest('.ui-cascadeselect-panel');
                    $this.alignSubPanel(subpanel, parentPanel);
                    subpanel.show();
                }
                else {
                    $this.input.val(item.attr('data-value'));
                    $this.label.text(item.attr('data-label'));
                    $this.callBehavior('itemSelect');
                    $this.hide();
                    e.stopPropagation();
                }
            })
            .on('keydown.cascadeselect', function(e) {
                var item = $(this).parent();
                var keyCode = $.ui.keyCode,
                key = e.which;
        
                switch(key) {
                    case keyCode.DOWN:
                        var nextItem = item.next();
                        if (nextItem) {
                            nextItem.children('.ui-cascadeselect-item-content').focus();
                        }
                        break;
        
                    case keyCode.UP:
                        var prevItem = item.prev();
                        if (prevItem) {
                            prevItem.children('.ui-cascadeselect-item-content').focus();
                        }
                        break;
        
                    case keyCode.RIGHT:
                        if (item.hasClass('ui-cascadeselect-item-group')) {
                            if (item.hasClass('ui-cascadeselect-item-active')) {
                                item.find('> .ui-cascadeselect-panel > .ui-cascadeselect-item:first > .ui-cascadeselect-item-content').focus();
                            }
                            else {
                                item.children('.ui-cascadeselect-item-content').trigger('click.cascadeselect');
                            }
                        }
                        break;
        
                    case keyCode.LEFT:
                        $this.hideGroup(item);
                        $this.hideGroup(item.siblings('.ui-cascadeselect-item-active'));

                        var parentItem = item.parent().closest('.ui-cascadeselect-item');
                        if (parentItem) {
                            parentItem.children('.ui-cascadeselect-item-content').focus();
                        }
                        break;
        
                    case keyCode.ENTER:
                        item.children('.ui-cascadeselect-item-content').trigger('click.cascadeselect');
                        if (!item.hasClass('ui-cascadeselect-item-group')) {
                            $this.input.trigger('focus.cascadeselect');
                        }
                        break;
        
                    default:
                        break;
                }
        
                e.preventDefault();
            });
    },
    
    /**
     * Deactivate siblings and active children of an item
     * @private
     * @param {JQuery} item cascadeselect panel element.
     */
    deactivateItems: function(item) {
        var parentItem = item.parent().parent();
        var siblings = item.siblings('.ui-cascadeselect-item-active');

        this.hideGroup(siblings);
        this.hideGroup(siblings.find('.ui-cascadeselect-item-active'));
        
        if (!parentItem.is(this.itemsWrapper)) {
            this.deactivateItems(parentItem);
        }
    },
    
    /**
     * Sets up the event listeners that only need to be set up once.
     * @private
     */
    bindConstantEvents: function() {
        var $this = this;

        PrimeFaces.utils.registerHideOverlayHandler(this, 'mousedown.' + this.id + '_hide', $this.panel,
            function() { return  $this.triggers },
            function(e, eventTarget) {
                if(!($this.panel.is(eventTarget) || $this.panel.has(eventTarget).length > 0)) {
                    $this.hide();
                }
            });

        PrimeFaces.utils.registerResizeHandler(this, 'resize.' + this.id + '_hide', $this.panel, function() {
            $this.hide();
        });

        PrimeFaces.utils.registerConnectedOverlayScrollHandler(this, 'scroll.' + $this.id + '_hide', function() {
            $this.hide();
        });
    },

    /**
     * Brings up the overlay panel with the available options.
     * @private
     */
    show: function() {
        this.panel.css({'display':'block', 'opacity':'0', 'pointer-events': 'none'});
        this.itemsWrapper.css({'overflow': 'scroll'});

        this.alignPanel();

        this.panel.css({'display':'none', 'opacity':'', 'pointer-events': '', 'z-index': PrimeFaces.nextZindex()});
        this.itemsWrapper.css({'overflow': ''});

        this.panel.show();

        this.input.attr('aria-expanded', true);
    },

    /**
     * Hides the panel of a group item.
     * @param {JQuery} item Dom element of the cascadeselect.
     */
    hideGroup: function(item) {
        item.removeClass('ui-cascadeselect-item-active ui-state-highlight').children('.ui-cascadeselect-panel').hide();
    },

    /**
     * Hides the overlay panel with the available options.
     */
    hide: function() {
        if (this.panel.is(':visible')) {
            this.panel.css('z-index', '').hide();
            this.input.attr('aria-expanded', false);
        }
    },

    /**
     * Adjust the width of the overlay panel.
     * @private 
     */
    alignPanelWidth: function() {
        //align panel and container
        if (this.cfg.appendTo) {
            this.panel.css('min-width', this.jq.outerWidth());
        }
    },

    /**
     * Align the overlay panel with the available options.
     */
    alignPanel: function() {
        this.alignPanelWidth();

        if (this.panel.parent().is(this.jq)) {
            this.panel.css({
                left: '0px',
                top: this.jq.innerHeight() + 'px'
            });
        }
        else {
            this.panel.css({left:'0px', top:'0px'}).position({
                my: 'left top'
                ,at: 'left bottom'
                ,of: this.jq
                ,collision: 'flipfit'
            });
        }
    },

    /**
     * Align the sub overlay panel with the available options.
     * @private
     * @param {JQuery} subpanel subpanel element in cascadeselect panel.
     * @param {JQuery} parentPanel parent panel element of the subpanel element.
     */
    alignSubPanel: function(subpanel, parentPanel) {
        var subitemWrapper = subpanel.children('.ui-cascadeselect-items-wrapper');
        subpanel.css({'display':'block', 'opacity':'0', 'pointer-events': 'none'});
        subitemWrapper.css({'overflow': 'scroll'});

        subpanel.css({left:'0px', top:'0px'}).position({
                my: 'left top'
                ,at: 'right top'
                ,of: parentPanel
                ,collision: 'flipfit'
            });

        subpanel.css({'display':'none', 'opacity':'', 'pointer-events': '', 'z-index': PrimeFaces.nextZindex()});
        subitemWrapper.css({'overflow': ''});
    }
});
