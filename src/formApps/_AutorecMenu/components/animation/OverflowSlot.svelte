<script>
    import { ripple }         from "#standard/action/animate/composable";

    import { TJSContextMenu } from "#standard/application/menu";
    import { TJSIconButton }  from "#standard/component/button";

    export let menu;
    export let info = {};

    const buttonOverflow = {
        icon: 'fas fa-ellipsis-v',
        efx: ripple(),
        styles: { 'margin-left': '0.5em' },
        clickPropagate: false,   // Necessary to capture click for Firefox.

        onPress: ({ event }) =>
        {
           TJSContextMenu.create({
              event,
              anchorToEventTarget: true,
              items: menu.items
           })
        }
    };
</script>

<div class="quickView">
    <i class={info?.icon} title={info.title}></i>
</div>
<div>
    <TJSIconButton button={buttonOverflow} slot=summary-end />
</div>

<style lang="scss">
    .quickView {
        margin-left: 5px;
        font-size: 13px;
    }
</style>
