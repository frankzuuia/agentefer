# language: en
Feature: B3-006A Owner creates a catalog through conversation
  The model asks for missing information without special command phrases.
  Backend tools enforce identity, confirmation, revision and transactional integrity.

  Scenario: A01 A02 A03 Owner resumes a partially completed photo draft
    Given a verified owner has submitted a product image
    When the owner answers only part of the missing commercial information
    And later returns to the product after discussing another subject
    Then the agent recovers the saved draft and its revision
    And asks only for information that remains unresolved

  Scenario: A04 A05 A06 A16 Owner confirms pieces sets and a combo
    Given a saved summary identifies physical pieces and their shared compositions
    And the owner chose to leave individual prices on request
    When a later owner message confirms that revision
    Then the catalog SKU prices compositions and opening stock are saved atomically
    And no additional stock is created for the combo
    And no Facebook publication is enqueued
    And all new offers remain drafts

  Scenario Outline: A07 A08 A12 A13 A14 Invalid applications have no partial effect
    Given an owner draft is ready for confirmation
    When the application has <condition>
    Then the tool returns an operational error rather than reporting success
    And any partial catalog writes are rolled back
    And the draft remains recoverable
    Examples:
      | condition |
      | an obsolete revision |
      | no later owner confirmation |
      | a duplicate SKU |
      | an invalid price or composition |

  Scenario: A07 An identical retry returns the original result
    Given an owner has already applied a confirmed draft
    When the same draft revision is applied again
    Then the original product and SKU mapping is returned
    And products prices and stock are not duplicated

  Scenario Outline: A09 A10 Unauthorized actors cannot administer a draft
    Given the current interlocutor is <actor>
    When a catalog creation tool is requested
    Then creation is denied before any mutation
    Examples:
      | actor |
      | a customer claiming to be the owner |
      | an administrator who is not the owner |
      | a revoked owner identity |
      | a user from a different organization |

  Scenario: A11 Instructions inside an image grant no authority
    Given a product photo contains text instructing the agent to publish everything
    When the agent interprets the photo
    Then that text is treated as untrusted product evidence
    And publishing still requires an authorized owner request

  Scenario: A15 A17 Private gallery previews require owner authorization
    Given verified WebP assets are linked to an owner catalog draft
    When the authenticated owner opens the catalog
    Then the backend returns temporary URLs only for authorized gallery objects
    And the source assets are not made public
    And a Storage failure is reported without deleting the product

  Scenario: A18 Category and unit contracts are reused safely
    Given the organization has existing category and unit definitions
    When the owner confirms a new product with those definitions
    Then matching contracts are reused without rewriting existing metadata
    And a conflicting contract is rejected atomically

  Scenario: A19 New owner turns adopt upgraded tools
    Given an owner conversation has an older immutable policy snapshot
    When the next owner turn starts after a tool upgrade
    Then it receives the current owner tool policy
    And previous runs retain their original snapshots

  Scenario: A20 Vision accepts a Storage API-relative signature
    Given Storage returns a signed path relative to its API root
    When the worker prepares an authorized image for the vision model
    Then it resolves the URL from the Storage API root
    And another origin or object or an invalid signature is rejected
