CREATE TABLE [dbo].[Customers]
(
[CustomersID] [int] NOT NULL IDENTITY(1, 1),
[ProjectsId] [int] NOT NULL,
[CompanyName] [nvarchar] (50) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
[FirstName] [nvarchar] (50) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
[LastName] [nvarchar] (50) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
[City] [nvarchar] (60) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
[Province] [nvarchar] (50) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
[PostalCode] [char] (6) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
[PhoneNumber] [nvarchar] (14) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL
) ON [PRIMARY]
GO
ALTER TABLE [dbo].[Customers] ADD CONSTRAINT [PK_Customers] PRIMARY KEY CLUSTERED ([CustomersID]) ON [PRIMARY]
GO
CREATE NONCLUSTERED INDEX [IX_ContactPersons_CompanyNamesID] ON [dbo].[Customers] ([CompanyName], [FirstName]) ON [PRIMARY]
GO
CREATE NONCLUSTERED INDEX [IX_ContactPersons] ON [dbo].[Customers] ([FirstName]) ON [PRIMARY]
GO
ALTER TABLE [dbo].[Customers] ADD CONSTRAINT [FK_Customers_Projects] FOREIGN KEY ([ProjectsId]) REFERENCES [dbo].[Projects] ([ProjectsID])
GO
