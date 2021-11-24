CREATE TABLE [dbo].[Claims]
(
[ClaimsID] [int] NOT NULL IDENTITY(1, 1),
[ProviderID] [int] NOT NULL,
[ClaimAmount] [decimal] (18, 2) NOT NULL CONSTRAINT [DF_Claims_ClaimAmount] DEFAULT ((0)),
[ServiceDate] [date] NOT NULL CONSTRAINT [DF_Claims_ServiceDate] DEFAULT (getdate()),
[EmployeeBenefitID] [int] NULL,
[ClaimDate] [date] NOT NULL CONSTRAINT [DF_Claims_ClaimDate] DEFAULT (getdate())
) ON [PRIMARY]
GO
ALTER TABLE [dbo].[Claims] ADD CONSTRAINT [CK_Claims_ClaimDate] CHECK (([ClaimDate]<=getdate()))
GO
ALTER TABLE [dbo].[Claims] ADD CONSTRAINT [CK_Claims_ServiceDate] CHECK (([ServiceDate]<=getdate()))
GO
ALTER TABLE [dbo].[Claims] ADD CONSTRAINT [PK_Claims] PRIMARY KEY CLUSTERED ([ClaimsID]) ON [PRIMARY]
GO
CREATE NONCLUSTERED INDEX [IX_Claims_EmployeeBenefit_Provider] ON [dbo].[Claims] ([EmployeeBenefitID], [ProviderID]) ON [PRIMARY]
GO
CREATE NONCLUSTERED INDEX [IX_Claims_Provider_EmployeeBenefit] ON [dbo].[Claims] ([ProviderID], [EmployeeBenefitID]) ON [PRIMARY]
GO
ALTER TABLE [dbo].[Claims] ADD CONSTRAINT [FK_Claims_EmployeeBenefits] FOREIGN KEY ([EmployeeBenefitID]) REFERENCES [dbo].[EmployeeBenefits] ([EmployeeBenefitID])
GO
ALTER TABLE [dbo].[Claims] ADD CONSTRAINT [FK_Claims_Provider] FOREIGN KEY ([ProviderID]) REFERENCES [dbo].[Providers] ([ProviderID])
GO
