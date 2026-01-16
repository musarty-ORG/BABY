// Component Registry Integration
// Provides access to popular UI component libraries

export interface ComponentRegistry {
  name: string
  url: string
  description: string
  categories: string[]
  components: ComponentInfo[]
}

export interface ComponentInfo {
  name: string
  description: string
  tags: string[]
  installCommand: string
  usage: string
}

export const AVAILABLE_REGISTRIES: ComponentRegistry[] = [
  {
    name: 'shadcn/ui',
    url: 'https://ui.shadcn.com',
    description:
      'Beautifully designed components built with Radix UI and Tailwind CSS',
    categories: ['Forms', 'Navigation', 'Layout', 'Feedback', 'Data Display'],
    components: [
      {
        name: 'Button',
        description: 'A customizable button component with multiple variants',
        tags: ['button', 'interactive', 'action'],
        installCommand: 'npx shadcn-ui@latest add button',
        usage: `<Button variant="outline" size="lg">Click me</Button>`,
      },
      {
        name: 'Card',
        description: 'A flexible container for grouping related content',
        tags: ['container', 'layout', 'content'],
        installCommand: 'npx shadcn-ui@latest add card',
        usage: `<Card><CardHeader><CardTitle>Title</CardTitle></CardHeader><CardContent>Content</CardContent></Card>`,
      },
      {
        name: 'Input',
        description: 'Form input field with validation support',
        tags: ['form', 'input', 'validation'],
        installCommand: 'npx shadcn-ui@latest add input',
        usage: `<Input type="email" placeholder="Enter your email" />`,
      },
      {
        name: 'Dialog',
        description: 'Modal dialog component for overlays and popups',
        tags: ['modal', 'overlay', 'popup'],
        installCommand: 'npx shadcn-ui@latest add dialog',
        usage: `<Dialog><DialogTrigger>Open</DialogTrigger><DialogContent>Content</DialogContent></Dialog>`,
      },
    ],
  },
  {
    name: 'Headless UI',
    url: 'https://headlessui.com',
    description: 'Completely unstyled, fully accessible UI components',
    categories: ['Forms', 'Navigation', 'Overlays', 'Lists'],
    components: [
      {
        name: 'Listbox',
        description: 'Custom select component with full keyboard navigation',
        tags: ['select', 'dropdown', 'accessible'],
        installCommand: 'npm install @headlessui/react',
        usage: `<Listbox value={selected} onChange={setSelected}><Listbox.Button>{selected.name}</Listbox.Button><Listbox.Options>...</Listbox.Options></Listbox>`,
      },
      {
        name: 'Menu',
        description: 'Dropdown menu component with keyboard support',
        tags: ['menu', 'dropdown', 'navigation'],
        installCommand: 'npm install @headlessui/react',
        usage: `<Menu><Menu.Button>Options</Menu.Button><Menu.Items>...</Menu.Items></Menu>`,
      },
      {
        name: 'Disclosure',
        description: 'Collapsible content component',
        tags: ['collapsible', 'accordion', 'toggle'],
        installCommand: 'npm install @headlessui/react',
        usage: `<Disclosure><Disclosure.Button>Toggle</Disclosure.Button><Disclosure.Panel>Content</Disclosure.Panel></Disclosure>`,
      },
    ],
  },
  {
    name: 'Radix UI',
    url: 'https://radix-ui.com',
    description: 'Low-level UI primitives with a focus on accessibility',
    categories: ['Primitives', 'Layout', 'Forms', 'Navigation'],
    components: [
      {
        name: 'Accordion',
        description: 'Vertically stacked set of interactive headings',
        tags: ['accordion', 'collapsible', 'faq'],
        installCommand: 'npm install @radix-ui/react-accordion',
        usage: `<Accordion.Root><Accordion.Item><Accordion.Header><Accordion.Trigger>Title</Accordion.Trigger></Accordion.Header><Accordion.Content>Content</Accordion.Content></Accordion.Item></Accordion.Root>`,
      },
      {
        name: 'Dropdown Menu',
        description: 'Displays a menu to the user triggered by a button',
        tags: ['dropdown', 'menu', 'actions'],
        installCommand: 'npm install @radix-ui/react-dropdown-menu',
        usage: `<DropdownMenu.Root><DropdownMenu.Trigger>Menu</DropdownMenu.Trigger><DropdownMenu.Content>...</DropdownMenu.Content></DropdownMenu.Root>`,
      },
      {
        name: 'Tooltip',
        description: 'Popup that displays information when hovering',
        tags: ['tooltip', 'popup', 'help'],
        installCommand: 'npm install @radix-ui/react-tooltip',
        usage: `<Tooltip.Provider><Tooltip.Root><Tooltip.Trigger>Hover me</Tooltip.Trigger><Tooltip.Content>Tooltip content</Tooltip.Content></Tooltip.Root></Tooltip.Provider>`,
      },
    ],
  },
  {
    name: 'Chakra UI',
    url: 'https://chakra-ui.com',
    description: 'Simple, modular and accessible React components',
    categories: ['Layout', 'Forms', 'Data Display', 'Feedback'],
    components: [
      {
        name: 'Box',
        description: 'The most abstract component for layout and styling',
        tags: ['layout', 'container', 'styling'],
        installCommand:
          'npm install @chakra-ui/react @emotion/react @emotion/styled framer-motion',
        usage: `<Box bg="tomato" w="100%" p={4} color="white">Box content</Box>`,
      },
      {
        name: 'Stack',
        description: 'Component for stacking elements with consistent spacing',
        tags: ['layout', 'spacing', 'flex'],
        installCommand: 'npm install @chakra-ui/react',
        usage: `<Stack direction="row" spacing={4}><Box>Item 1</Box><Box>Item 2</Box></Stack>`,
      },
      {
        name: 'Alert',
        description:
          'Component to communicate state and contextual information',
        tags: ['alert', 'notification', 'feedback'],
        installCommand: 'npm install @chakra-ui/react',
        usage: `<Alert status="success"><AlertIcon /><AlertTitle>Success!</AlertTitle><AlertDescription>Your data was saved.</AlertDescription></Alert>`,
      },
    ],
  },
]

export function getRegistryByName(name: string): ComponentRegistry | undefined {
  return AVAILABLE_REGISTRIES.find((registry) => registry.name === name)
}

export function searchComponents(query: string): ComponentInfo[] {
  const allComponents = AVAILABLE_REGISTRIES.flatMap(
    (registry) => registry.components
  )
  return allComponents.filter(
    (component) =>
      component.name.toLowerCase().includes(query.toLowerCase()) ||
      component.description.toLowerCase().includes(query.toLowerCase()) ||
      component.tags.some((tag) =>
        tag.toLowerCase().includes(query.toLowerCase())
      )
  )
}

export function getComponentsByCategory(category: string): ComponentInfo[] {
  const allComponents = AVAILABLE_REGISTRIES.flatMap(
    (registry) => registry.components
  )
  return allComponents.filter((component) =>
    component.tags.some((tag) =>
      tag.toLowerCase().includes(category.toLowerCase())
    )
  )
}

export function generateRegistryPrompt(): string {
  return `
Available Component Registries and Components:

${AVAILABLE_REGISTRIES.map(
  (registry) => `
## ${registry.name}
${registry.description}
Categories: ${registry.categories.join(', ')}

Popular Components:
${registry.components
  .slice(0, 3)
  .map((comp) => `- ${comp.name}: ${comp.description}`)
  .join('\n')}

Installation: ${registry.components[0]?.installCommand}
`
).join('\n')}

When generating code, prefer using these established component libraries for:
- Better accessibility and user experience
- Consistent design patterns
- Reduced development time
- Production-ready components

Include installation commands in comments and use proper import statements.
`
}
