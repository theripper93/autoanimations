<script>
    import { TJSScrollContainer }   from "#standard/component/container";

    import Animation                from "../animation/Animation.svelte";

    /** @type {CategoryStore} */
    export let category;

    $: dataReducer = category.dataReducer;

    /**
     * When the data reducer count changes or there is any folder open / close changes invoke `calcAllFolderState`.
     * This is debounced as the all open / closed button may adjust many folder states.
     *
     * @type {Function}
     */
    const onFolderChange = foundry.utils.debounce(() => category.calcAllFolderState(), 100);

    $: onFolderChange($dataReducer);
</script>

<TJSScrollContainer scrollTop={category.stores.scrollTop}>
   <main on:openAny={onFolderChange}
         on:closeAny={onFolderChange}>
      {#each [...$dataReducer] as animation, idx (animation.id)}
         <section>
            <Animation {animation} {idx} {category}/>
         </section>
      {/each}
   </main>
</TJSScrollContainer>

<style lang=scss>
   main {
      display: flex;
      flex-direction: column;
      gap: 3px;

      padding: 1rem 0.5rem 1rem 1rem;
   }

   section {
      height: fit-content;
      width: 100%;
   }
</style>
